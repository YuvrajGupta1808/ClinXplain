import { Calendar, ClipboardPlus, UserPlus } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { appointmentsAPI, patientsAPI, visitsAPI } from '../services/api';

interface Patient {
  id: string;
  name: string;
  avatarInitials: string;
  lastVisit: string;
}

const AppointmentsScreen: React.FC = () => {
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [showAddVisit, setShowAddVisit] = useState(false);
  const [showAddAppointment, setShowAddAppointment] = useState(false);
  const [allPatients, setAllPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [newPatient, setNewPatient] = useState({
    fullName: '',
    dateOfBirth: '',
    gender: 'Unknown',
    phone: '',
    email: '',
    address: '',
    insuranceProvider: '',
    insuranceMemberId: ''
  });
  
  const [newAppointment, setNewAppointment] = useState({
    patientId: '',
    patientName: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    type: 'Primary Care',
    status: 'Confirmed'
  });
  
  const [newVisit, setNewVisit] = useState({
    patientId: '',
    visitDate: new Date().toISOString().slice(0, 16),
    type: 'Primary Care',
    mode: 'In-person',
    location: 'Main Clinic',
    chiefComplaint: {
      primaryConcern: '',
      duration: '',
      severity: ''
    },
    symptoms: [{ name: '', onsetDate: '', severityScale: 5, frequency: '' }],
    vitals: {
      bloodPressure: '',
      heartRate: '',
      temperature: '',
      respiratoryRate: '',
      oxygenSaturation: '',
      weight: '',
      height: ''
    },
    medications: [{ name: '', dosage: '', frequency: '', instructions: '' }],
    allergies: [] as string[],
    clinicalAssessment: {
      primaryDiagnosis: '',
      confidenceLevel: 'Medium',
      differentialDiagnoses: [] as string[],
      clinicalReasoning: ''
    },
    planOfCare: {
      medicationsPrescribed: [{ name: '', dosage: '', frequency: '' }],
      testsOrdered: [] as string[],
      lifestyleRecommendations: [] as string[]
    },
    insights: {
      recommendedQuestions: ['', '', ''],
      differentialDiagnoses: [{ diagnosis: '', confidence: 'Medium', reasoning: '' }],
      nextSteps: ['', '']
    }
  });

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      const response = await patientsAPI.getAll();
      if (response.success) {
        setAllPatients(response.data);
      }
    } catch (error) {
      console.error('Error loading patients:', error);
    }
  };
  
  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await patientsAPI.create({
        fullName: newPatient.fullName,
        dateOfBirth: newPatient.dateOfBirth,
        gender: newPatient.gender,
        contactInfo: {
          phone: newPatient.phone,
          email: newPatient.email,
          address: newPatient.address
        },
        insuranceInfo: {
          provider: newPatient.insuranceProvider,
          memberId: newPatient.insuranceMemberId
        }
      });
      
      if (response.success) {
        setShowAddPatient(false);
        setNewPatient({
          fullName: '',
          dateOfBirth: '',
          gender: 'Unknown',
          phone: '',
          email: '',
          address: '',
          insuranceProvider: '',
          insuranceMemberId: ''
        });
        loadPatients();
        alert('Patient created successfully!');
      }
    } catch (error) {
      console.error('Error creating patient:', error);
      alert('Failed to create patient');
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await visitsAPI.create({
        patientId: newVisit.patientId,
        visitDate: newVisit.visitDate,
        type: newVisit.type,
        mode: newVisit.mode,
        location: newVisit.location,
        chiefComplaint: newVisit.chiefComplaint,
        symptoms: newVisit.symptoms.filter(s => s.name),
        vitals: newVisit.vitals,
        medications: newVisit.medications.filter(m => m.name),
        allergies: newVisit.allergies,
        clinicalAssessment: newVisit.clinicalAssessment,
        planOfCare: newVisit.planOfCare,
        insights: newVisit.insights
      });
      
      if (response.success) {
        setShowAddVisit(false);
        setNewVisit({
          patientId: '',
          visitDate: new Date().toISOString().slice(0, 16),
          type: 'Primary Care',
          mode: 'In-person',
          location: 'Main Clinic',
          chiefComplaint: { primaryConcern: '', duration: '', severity: '' },
          symptoms: [{ name: '', onsetDate: '', severityScale: 5, frequency: '' }],
          vitals: { bloodPressure: '', heartRate: '', temperature: '', respiratoryRate: '', oxygenSaturation: '', weight: '', height: '' },
          medications: [{ name: '', dosage: '', frequency: '', instructions: '' }],
          allergies: [],
          clinicalAssessment: { primaryDiagnosis: '', confidenceLevel: 'Medium', differentialDiagnoses: [], clinicalReasoning: '' },
          planOfCare: { medicationsPrescribed: [{ name: '', dosage: '', frequency: '' }], testsOrdered: [], lifestyleRecommendations: [] },
          insights: { recommendedQuestions: ['', '', ''], differentialDiagnoses: [{ diagnosis: '', confidence: 'Medium', reasoning: '' }], nextSteps: ['', ''] }
        });
        alert('Visit created successfully!');
      }
    } catch (error) {
      console.error('Error creating visit:', error);
      alert('Failed to create visit');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await appointmentsAPI.create({
        patientId: newAppointment.patientId,
        patientName: newAppointment.patientName,
        date: newAppointment.date,
        time: newAppointment.time,
        type: newAppointment.type,
        status: newAppointment.status
      });
      
      if (response.success) {
        setShowAddAppointment(false);
        setNewAppointment({
          patientId: '',
          patientName: '',
          date: new Date().toISOString().split('T')[0],
          time: '09:00',
          type: 'Primary Care',
          status: 'Confirmed'
        });
        alert('Appointment scheduled successfully!');
      }
    } catch (error) {
      console.error('Error creating appointment:', error);
      alert('Failed to schedule appointment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 p-8 flex items-center justify-between z-10">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Appointments & Records</h1>
          <p className="text-slate-500 mt-1 font-medium">Schedule appointments, add patients, or create visit records</p>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={() => {
              setShowAddAppointment(!showAddAppointment);
              setShowAddPatient(false);
              setShowAddVisit(false);
            }}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
              showAddAppointment 
                ? 'bg-purple-600 text-white shadow-lg' 
                : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
            }`}
          >
            <Calendar size={20} />
            {showAddAppointment ? 'Cancel' : 'Schedule Appointment'}
          </button>
          <button 
            onClick={() => {
              setShowAddPatient(!showAddPatient);
              setShowAddAppointment(false);
              setShowAddVisit(false);
            }}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
              showAddPatient 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
            }`}
          >
            <UserPlus size={20} />
            {showAddPatient ? 'Cancel' : 'Add Patient'}
          </button>
          <button 
            onClick={() => {
              setShowAddVisit(!showAddVisit);
              setShowAddAppointment(false);
              setShowAddPatient(false);
            }}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
              showAddVisit 
                ? 'bg-emerald-600 text-white shadow-lg' 
                : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
            }`}
          >
            <ClipboardPlus size={20} />
            {showAddVisit ? 'Cancel' : 'Add Visit'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {showAddAppointment && (
          <div className="max-w-4xl mx-auto bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
            <form onSubmit={handleAddAppointment} className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center">
                  <Calendar className="text-purple-600" size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Schedule Appointment</h2>
                  <p className="text-slate-500">Book an appointment for a patient</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Patient *</label>
                  <select
                    required
                    value={newAppointment.patientId}
                    onChange={(e) => {
                      const patient = allPatients.find(p => p.id === e.target.value);
                      setNewAppointment({
                        ...newAppointment, 
                        patientId: e.target.value,
                        patientName: patient?.name || ''
                      });
                    }}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Select a patient</option>
                    {allPatients.map(patient => (
                      <option key={patient.id} value={patient.id}>
                        {patient.name} - {patient.id.substring(0, 8)}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Date *</label>
                  <input
                    type="date"
                    required
                    value={newAppointment.date}
                    onChange={(e) => setNewAppointment({...newAppointment, date: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Time *</label>
                  <input
                    type="time"
                    required
                    value={newAppointment.time}
                    onChange={(e) => setNewAppointment({...newAppointment, time: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Appointment Type</label>
                  <select
                    value={newAppointment.type}
                    onChange={(e) => setNewAppointment({...newAppointment, type: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="Primary Care">Primary Care</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="Urgent Care">Urgent Care</option>
                    <option value="Specialist">Specialist</option>
                    <option value="Annual Physical">Annual Physical</option>
                    <option value="Consultation">Consultation</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Status</label>
                  <select
                    value={newAppointment.status}
                    onChange={(e) => setNewAppointment({...newAppointment, status: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="Confirmed">Confirmed</option>
                    <option value="Pending">Pending</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Scheduling Appointment...' : 'Schedule Appointment'}
              </button>
            </form>
          </div>
        )}
        
        {showAddPatient && (
          <div className="max-w-4xl mx-auto bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
            <form onSubmit={handleAddPatient} className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center">
                  <UserPlus className="text-blue-600" size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Add New Patient</h2>
                  <p className="text-slate-500">Enter patient information to create a new record</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newPatient.fullName}
                    onChange={(e) => setNewPatient({...newPatient, fullName: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="John Doe"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Date of Birth</label>
                  <input
                    type="date"
                    value={newPatient.dateOfBirth}
                    onChange={(e) => setNewPatient({...newPatient, dateOfBirth: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Gender</label>
                  <select
                    value={newPatient.gender}
                    onChange={(e) => setNewPatient({...newPatient, gender: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Unknown">Unknown</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={newPatient.phone}
                    onChange={(e) => setNewPatient({...newPatient, phone: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="(555) 123-4567"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={newPatient.email}
                    onChange={(e) => setNewPatient({...newPatient, email: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="john@example.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Address</label>
                  <input
                    type="text"
                    value={newPatient.address}
                    onChange={(e) => setNewPatient({...newPatient, address: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="123 Main St"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Insurance Provider</label>
                  <input
                    type="text"
                    value={newPatient.insuranceProvider}
                    onChange={(e) => setNewPatient({...newPatient, insuranceProvider: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Blue Cross"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Insurance Member ID</label>
                  <input
                    type="text"
                    value={newPatient.insuranceMemberId}
                    onChange={(e) => setNewPatient({...newPatient, insuranceMemberId: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="ABC123456"
                  />
                </div>
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Patient...' : 'Create Patient'}
              </button>
            </form>
          </div>
        )}
        
        {showAddVisit && (
          <div className="max-w-6xl mx-auto bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
            <form onSubmit={handleAddVisit} className="space-y-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
                  <ClipboardPlus className="text-emerald-600" size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Add New Visit</h2>
                  <p className="text-slate-500">Create a comprehensive visit record with clinical details</p>
                </div>
              </div>
              
              {/* Basic Visit Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 border-b pb-2">Visit Information</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-3">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Patient *</label>
                    <select
                      required
                      value={newVisit.patientId}
                      onChange={(e) => setNewVisit({...newVisit, patientId: e.target.value})}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Select a patient</option>
                      {allPatients.map(patient => (
                        <option key={patient.id} value={patient.id}>
                          {patient.name} - {patient.id.substring(0, 8)}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Visit Date & Time *</label>
                    <input
                      type="datetime-local"
                      required
                      value={newVisit.visitDate}
                      onChange={(e) => setNewVisit({...newVisit, visitDate: e.target.value})}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Visit Type</label>
                    <select
                      value={newVisit.type}
                      onChange={(e) => setNewVisit({...newVisit, type: e.target.value})}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Primary Care">Primary Care</option>
                      <option value="Follow-up">Follow-up</option>
                      <option value="Urgent Care">Urgent Care</option>
                      <option value="Specialist">Specialist</option>
                      <option value="Annual Physical">Annual Physical</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Visit Mode</label>
                    <select
                      value={newVisit.mode}
                      onChange={(e) => setNewVisit({...newVisit, mode: e.target.value})}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="In-person">In-person</option>
                      <option value="Telemedicine">Telemedicine</option>
                      <option value="Phone">Phone</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Chief Complaint */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 border-b pb-2">Chief Complaint</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Primary Concern</label>
                    <input
                      type="text"
                      value={newVisit.chiefComplaint.primaryConcern}
                      onChange={(e) => setNewVisit({...newVisit, chiefComplaint: {...newVisit.chiefComplaint, primaryConcern: e.target.value}})}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="e.g., Chest pain"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Duration</label>
                    <input
                      type="text"
                      value={newVisit.chiefComplaint.duration}
                      onChange={(e) => setNewVisit({...newVisit, chiefComplaint: {...newVisit.chiefComplaint, duration: e.target.value}})}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="e.g., 2 days"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Severity</label>
                    <select
                      value={newVisit.chiefComplaint.severity}
                      onChange={(e) => setNewVisit({...newVisit, chiefComplaint: {...newVisit.chiefComplaint, severity: e.target.value}})}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Select severity</option>
                      <option value="Mild">Mild</option>
                      <option value="Moderate">Moderate</option>
                      <option value="Severe">Severe</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Vitals */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 border-b pb-2">Vital Signs</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Blood Pressure</label>
                    <input
                      type="text"
                      value={newVisit.vitals.bloodPressure}
                      onChange={(e) => setNewVisit({...newVisit, vitals: {...newVisit.vitals, bloodPressure: e.target.value}})}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="120/80"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Heart Rate</label>
                    <input
                      type="text"
                      value={newVisit.vitals.heartRate}
                      onChange={(e) => setNewVisit({...newVisit, vitals: {...newVisit.vitals, heartRate: e.target.value}})}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="72 bpm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Temperature</label>
                    <input
                      type="text"
                      value={newVisit.vitals.temperature}
                      onChange={(e) => setNewVisit({...newVisit, vitals: {...newVisit.vitals, temperature: e.target.value}})}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="98.6°F"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Respiratory Rate</label>
                    <input
                      type="text"
                      value={newVisit.vitals.respiratoryRate}
                      onChange={(e) => setNewVisit({...newVisit, vitals: {...newVisit.vitals, respiratoryRate: e.target.value}})}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="16/min"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">O2 Saturation</label>
                    <input
                      type="text"
                      value={newVisit.vitals.oxygenSaturation}
                      onChange={(e) => setNewVisit({...newVisit, vitals: {...newVisit.vitals, oxygenSaturation: e.target.value}})}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="98%"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Weight</label>
                    <input
                      type="text"
                      value={newVisit.vitals.weight}
                      onChange={(e) => setNewVisit({...newVisit, vitals: {...newVisit.vitals, weight: e.target.value}})}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="150 lbs"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Height</label>
                    <input
                      type="text"
                      value={newVisit.vitals.height}
                      onChange={(e) => setNewVisit({...newVisit, vitals: {...newVisit.vitals, height: e.target.value}})}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="5'8&quot;"
                    />
                  </div>
                </div>
              </div>

              {/* Clinical Assessment */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 border-b pb-2">Clinical Assessment</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Primary Diagnosis</label>
                    <input
                      type="text"
                      value={newVisit.clinicalAssessment.primaryDiagnosis}
                      onChange={(e) => setNewVisit({...newVisit, clinicalAssessment: {...newVisit.clinicalAssessment, primaryDiagnosis: e.target.value}})}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Primary diagnosis"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Confidence Level</label>
                    <select
                      value={newVisit.clinicalAssessment.confidenceLevel}
                      onChange={(e) => setNewVisit({...newVisit, clinicalAssessment: {...newVisit.clinicalAssessment, confidenceLevel: e.target.value}})}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Clinical Reasoning</label>
                    <textarea
                      value={newVisit.clinicalAssessment.clinicalReasoning}
                      onChange={(e) => setNewVisit({...newVisit, clinicalAssessment: {...newVisit.clinicalAssessment, clinicalReasoning: e.target.value}})}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      rows={3}
                      placeholder="Clinical reasoning and notes"
                    />
                  </div>
                </div>
              </div>

              {/* Medications */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 border-b pb-2">Current Medications</h3>
                {newVisit.medications.map((med, idx) => (
                  <div key={idx} className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Medication Name</label>
                      <input
                        type="text"
                        value={med.name}
                        onChange={(e) => {
                          const meds = [...newVisit.medications];
                          meds[idx].name = e.target.value;
                          setNewVisit({...newVisit, medications: meds});
                        }}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="Medication name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Dosage</label>
                      <input
                        type="text"
                        value={med.dosage}
                        onChange={(e) => {
                          const meds = [...newVisit.medications];
                          meds[idx].dosage = e.target.value;
                          setNewVisit({...newVisit, medications: meds});
                        }}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="10mg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Frequency</label>
                      <input
                        type="text"
                        value={med.frequency}
                        onChange={(e) => {
                          const meds = [...newVisit.medications];
                          meds[idx].frequency = e.target.value;
                          setNewVisit({...newVisit, medications: meds});
                        }}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="Twice daily"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Instructions</label>
                      <input
                        type="text"
                        value={med.instructions}
                        onChange={(e) => {
                          const meds = [...newVisit.medications];
                          meds[idx].instructions = e.target.value;
                          setNewVisit({...newVisit, medications: meds});
                        }}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="With food"
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setNewVisit({...newVisit, medications: [...newVisit.medications, { name: '', dosage: '', frequency: '', instructions: '' }]})}
                  className="text-sm text-emerald-600 font-semibold hover:text-emerald-700"
                >
                  + Add Another Medication
                </button>
              </div>

              {/* Plan of Care */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 border-b pb-2">Plan of Care - Medications Prescribed</h3>
                {newVisit.planOfCare.medicationsPrescribed.map((med, idx) => (
                  <div key={idx} className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Medication</label>
                      <input
                        type="text"
                        value={med.name}
                        onChange={(e) => {
                          const meds = [...newVisit.planOfCare.medicationsPrescribed];
                          meds[idx].name = e.target.value;
                          setNewVisit({...newVisit, planOfCare: {...newVisit.planOfCare, medicationsPrescribed: meds}});
                        }}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="Medication name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Dosage</label>
                      <input
                        type="text"
                        value={med.dosage}
                        onChange={(e) => {
                          const meds = [...newVisit.planOfCare.medicationsPrescribed];
                          meds[idx].dosage = e.target.value;
                          setNewVisit({...newVisit, planOfCare: {...newVisit.planOfCare, medicationsPrescribed: meds}});
                        }}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="10mg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Frequency</label>
                      <input
                        type="text"
                        value={med.frequency}
                        onChange={(e) => {
                          const meds = [...newVisit.planOfCare.medicationsPrescribed];
                          meds[idx].frequency = e.target.value;
                          setNewVisit({...newVisit, planOfCare: {...newVisit.planOfCare, medicationsPrescribed: meds}});
                        }}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="Once daily"
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setNewVisit({...newVisit, planOfCare: {...newVisit.planOfCare, medicationsPrescribed: [...newVisit.planOfCare.medicationsPrescribed, { name: '', dosage: '', frequency: '' }]}})}
                  className="text-sm text-emerald-600 font-semibold hover:text-emerald-700"
                >
                  + Add Prescribed Medication
                </button>
              </div>

              {/* Insights */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 border-b pb-2">Clinical Insights</h3>
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-slate-700">Recommended Questions</label>
                  {newVisit.insights.recommendedQuestions.map((q, idx) => (
                    <input
                      key={idx}
                      type="text"
                      value={q}
                      onChange={(e) => {
                        const questions = [...newVisit.insights.recommendedQuestions];
                        questions[idx] = e.target.value;
                        setNewVisit({...newVisit, insights: {...newVisit.insights, recommendedQuestions: questions}});
                      }}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder={`Question ${idx + 1}`}
                    />
                  ))}
                </div>
                
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-slate-700">Next Steps</label>
                  {newVisit.insights.nextSteps.map((step, idx) => (
                    <input
                      key={idx}
                      type="text"
                      value={step}
                      onChange={(e) => {
                        const steps = [...newVisit.insights.nextSteps];
                        steps[idx] = e.target.value;
                        setNewVisit({...newVisit, insights: {...newVisit.insights, nextSteps: steps}});
                      }}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder={`Next step ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Visit...' : 'Create Visit'}
              </button>
            </form>
          </div>
        )}
        
        {!showAddPatient && !showAddVisit && !showAddAppointment && (
          <div className="max-w-2xl mx-auto text-center py-24">
            <div className="w-24 h-24 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Calendar className="text-slate-400" size={48} />
            </div>
            <h2 className="text-3xl font-bold text-slate-800 mb-3">Quick Database Actions</h2>
            <p className="text-slate-500 text-lg mb-8">Schedule appointments, add patients, or create visit records</p>
            <div className="flex gap-4 justify-center">
              <button 
                onClick={() => setShowAddAppointment(true)}
                className="flex items-center gap-2 px-8 py-4 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-all shadow-md hover:shadow-lg"
              >
                <Calendar size={20} />
                Schedule Appointment
              </button>
              <button 
                onClick={() => setShowAddPatient(true)}
                className="flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg"
              >
                <UserPlus size={20} />
                Add Patient
              </button>
              <button 
                onClick={() => setShowAddVisit(true)}
                className="flex items-center gap-2 px-8 py-4 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg"
              >
                <ClipboardPlus size={20} />
                Add Visit
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppointmentsScreen;
