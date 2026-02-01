import { useEffect, useRef, useState } from 'react';
import { AiSuggestion, Patient, TranscriptEntry } from '../types';

export const useVisitLogic = (patient: Patient, user: any) => {
    const [isRecording, setIsRecording] = useState(false);
    const [visit, setVisit] = useState<any>(null);
    const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
    const [activeTab, setActiveTab] = useState<'note' | 'transcript' | 'attachments'>('note');
    const [isGenerating, setIsGenerating] = useState(false);
    const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
    const [initialInsights, setInitialInsights] = useState<any>(null);
    const [notification, setNotification] = useState<string | null>(null);
    const callObjectRef = useRef<any>(null);

    useEffect(() => {
        return () => {
            if (callObjectRef.current) {
                callObjectRef.current.leave();
                callObjectRef.current.destroy();
            }
        };
    }, []);

    useEffect(() => {
        const loadData = async () => {
            if (!patient?.id) return;
            try {
                const { getPatientVisits } = await import('../services/scribeService');
                const history = await getPatientVisits(patient.id);
                if (history && history.length > 0) {
                    setVisit(history[0]);
                    setTranscript(history[0].transcript || []);
                } else {
                    setTranscript([]);
                    setVisit(null);
                }
            } catch (e) {
                console.error("Failed to load history", e);
            }
        };
        loadData();
    }, [patient]);

    useEffect(() => {
        const loadInitialInsights = async () => {
            if (!patient?.id) return;
            try {
                const response = await fetch(`http://localhost:3001/api/scribe/patient/${patient.id}/initial-insights`);
                if (response.ok) {
                    const insights = await response.json();
                    setInitialInsights(insights);
                }
            } catch (e) {
                console.error("❌ Error loading initial insights:", e);
            }
        };
        loadInitialInsights();
    }, [patient]);

    useEffect(() => {
        let interval: any;
        if (isRecording && visit?.visitId) {
            interval = setInterval(async () => {
                try {
                    const { getVisitDetails } = await import('../services/scribeService');
                    const updatedVisit = await getVisitDetails(visit.visitId);
                    if (updatedVisit) {
                        setVisit(updatedVisit);
                        if (updatedVisit.transcript) setTranscript(updatedVisit.transcript);
                    }
                } catch (e) {
                    console.error('Error polling visit updates:', e);
                }
            }, 5000);
        }
        return () => clearInterval(interval);
    }, [isRecording, visit?.visitId]);

    useEffect(() => {
        let interval: any;
        if (activeTab === 'note' && visit?.visitId && visit?.status === 'in-progress') {
            interval = setInterval(async () => {
                try {
                    const { getVisitData } = await import('../services/scribeService');
                    const updatedVisit = await getVisitData(visit.visitId);
                    if (updatedVisit) {
                        setVisit(updatedVisit);
                        if (updatedVisit.transcript) setTranscript(updatedVisit.transcript);
                    }
                } catch (e) {
                    console.error('❌ Error polling visit updates for Note tab:', e);
                }
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [activeTab, visit?.visitId, visit?.status]);

    const handleStartRecording = async () => {
        if (!isRecording) {
            try {
                const { startScribeSession } = await import('../services/scribeService');
                const session = await startScribeSession(user?.id || "doctor-1", patient.id);
                setVisit((prev: any) => ({ ...prev, visitId: session.visitId, status: 'in-progress' }));

                console.log('📝 Visit session created:', session.visitId);
                setIsRecording(true);

                // Use browser's MediaRecorder with Deepgram WebSocket
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

                    // Connect to Deepgram WebSocket
                    const deepgramWs = new WebSocket('wss://api.deepgram.com/v1/listen?model=nova-2&language=en&smart_format=true', [
                        'token',
                        '609273b7f977f314b5679a2f5e8d210d45aa421b'
                    ]);

                    deepgramWs.onopen = () => {
                        console.log('🎙️ Connected to Deepgram');
                        mediaRecorder.start(250); // Send data every 250ms
                    };

                    deepgramWs.onmessage = async (message) => {
                        const data = JSON.parse(message.data);
                        if (data.channel?.alternatives?.[0]?.transcript) {
                            const transcript = data.channel.alternatives[0].transcript;
                            if (transcript.trim()) {
                                console.log('📝 Transcribed:', transcript);
                                // Send to backend
                                try {
                                    await fetch(`http://localhost:3001/api/scribe/visit/${session.visitId}/transcript`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            speaker: user?.name || 'Doctor',
                                            text: transcript
                                        })
                                    });
                                } catch (e) {
                                    console.error('Failed to send transcript:', e);
                                }
                            }
                        }
                    };

                    deepgramWs.onerror = (error) => {
                        console.error('Deepgram error:', error);
                    };

                    mediaRecorder.ondataavailable = (event) => {
                        if (event.data.size > 0 && deepgramWs.readyState === WebSocket.OPEN) {
                            deepgramWs.send(event.data);
                        }
                    };

                    callObjectRef.current = {
                        mediaRecorder,
                        deepgramWs,
                        stream,
                        leave: () => {
                            mediaRecorder.stop();
                            deepgramWs.close();
                            stream.getTracks().forEach(track => track.stop());
                        },
                        destroy: () => { }
                    };

                    console.log('✅ Recording started with Deepgram transcription');
                } catch (error) {
                    console.error('Failed to start recording:', error);
                    alert('Failed to access microphone. Please allow microphone permissions.');
                    setIsRecording(false);
                }
            } catch (e) {
                console.error("Failed to start session", e);
                alert("Failed to start recording session.");
            }
        } else {
            if (callObjectRef.current) {
                try {
                    await callObjectRef.current.leave();
                    if (callObjectRef.current.destroy) {
                        await callObjectRef.current.destroy();
                    }
                } catch (e) {
                    console.warn('Error stopping recording:', e);
                }
                callObjectRef.current = null;
            }
            setIsRecording(false);
        }
    };

    const handleGenerateNote = async () => {
        setActiveTab('note');
        setIsGenerating(true);
        try {
            let currentVisitId = visit?.visitId;
            if (!currentVisitId) {
                const { startScribeSession } = await import('../services/scribeService');
                const session = await startScribeSession(user?.id || "doctor-1", patient.id);
                currentVisitId = session.visitId;
                setVisit((prev: any) => ({ ...prev, visitId: currentVisitId, status: 'in-progress' }));
            }

            // Call regenerate endpoint which will generate from previous visits if no transcript
            console.log('🔔 Generating clinical note from previous visits...');
            const response = await fetch(`http://localhost:3001/api/scribe/visit/${currentVisitId}/regenerate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                const generatedVisit = await response.json();
                console.log('✅ Clinical note generated successfully');
                setVisit(generatedVisit);
                if (generatedVisit.transcript) setTranscript(generatedVisit.transcript);
                setNotification('Clinical note generated from previous visits');
                setTimeout(() => setNotification(null), 3000);
            } else {
                const error = await response.json();
                console.error('❌ Failed to generate note:', error);
                alert(error.error || 'Failed to generate note');
            }
        } catch (e) {
            console.error('❌ Failed to generate note:', e);
            alert('Failed to generate note: ' + (e as Error).message);
        } finally {
            setIsGenerating(false);
        }
    };

    return {
        isRecording, visit, transcript, activeTab, isGenerating, suggestions, initialInsights, notification,
        setActiveTab, handleStartRecording, handleGenerateNote,
        handleVisitChange: setVisit
    };
};
