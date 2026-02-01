import { Patient, TranscriptEntry } from './types';

export const MOCK_PATIENTS: Patient[] = [
  { id: '1', name: 'Lex Luthor', lastVisit: '18 Feb 14:30 PM', avatarInitials: 'LL' },
  { id: '2', name: 'Veronica V', lastVisit: '24 Jan 17:47 PM', avatarInitials: 'VV' },
  { id: '3', name: 'Baljeet', lastVisit: '07 Jan 15:42 PM', avatarInitials: 'B' },
  { id: '4', name: 'David Moreno', lastVisit: '03 Feb 11:40 AM', avatarInitials: 'DM' },
  { id: '5', name: 'Patient 53', lastVisit: 'Today', avatarInitials: 'P5' },
];

export const INITIAL_TRANSCRIPT_DEMO: TranscriptEntry[] = [
  { speaker: 'Doctor', text: "Hi Lex, good to see you again. How have you been feeling since our last visit?", timestamp: 0 },
  { speaker: 'Patient', text: "Honestly doctor, I've been feeling a bit low. The holidays were rough.", timestamp: 2000 },
  { speaker: 'Doctor', text: "I'm sorry to hear that. Have you noticed changes in your sleep or appetite?", timestamp: 5000 },
  { speaker: 'Patient', text: "Yeah, actually. I'm sleeping way more than usual, but I still feel tired. And I'm craving carbs constantly.", timestamp: 9000 },
  { speaker: 'Doctor', text: "I see. And how long has this been going on?", timestamp: 14000 },
  { speaker: 'Patient', text: "About three months now. Since early November.", timestamp: 17000 },
  { speaker: 'Doctor', text: "Do you have any family history of depression?", timestamp: 20000 },
  { speaker: 'Patient', text: "My mother struggled with it during winters specifically.", timestamp: 23000 },
];
