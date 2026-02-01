import { client, connectRedis } from './src/config/redis.js';
import { Appointment } from './src/models/Appointment.js';
import { Doctor } from './src/models/Doctor.js';
import { Patient } from './src/models/Patient.js';
import { Visit } from './src/models/Visit.js';

async function seedData() {
    try {
        await connectRedis();
        console.log('\n🧹 Clearing previous data...\n');
        
        const keys = await client.keys('*');
        if (keys.length > 0) {
            await client.del(keys);
            console.log(`✓ Deleted ${keys.length} keys`);
        }

        console.log('\n🌱 Starting enhanced data seeding...\n');

        // Create Doctor with Stable ID
        console.log('Creating Dr. Marcus Thorne (Stable ID)...');
        const doctorId = 'd03e839e-1234-5678-90ab-cdef12345678';
        const doctor = await Doctor.create({
            id: doctorId,
            email: 'doctor@clinxplain.com',
            password: 'demo123',
            name: 'Dr. Marcus Thorne',
            specialty: 'Internal Medicine'
        });

        // Create Detailed Patients
        console.log('\nCreating Patients with detailed profiles...');
        
        const patientProfiles = [
            { fullName: 'David Martinez', dateOfBirth: '1978-11-30', gender: 'Male', contactInfo: { phone: '(555) 345-6789', email: 'david.m@email.com', address: '123 Oak St, Springfield' }, insuranceInfo: { provider: 'BlueCross', memberId: 'BC-123456789' } },
            { fullName: 'Sarah Williams', dateOfBirth: '1988-12-25', gender: 'Female', contactInfo: { phone: '(555) 678-9012', email: 'sarah.w@email.com', address: '456 Maple Ave, Springfield' }, insuranceInfo: { provider: 'Aetna', memberId: 'AE-987654321' } },
            { fullName: 'Robert Chen', dateOfBirth: '1985-03-15', gender: 'Male', contactInfo: { phone: '(555) 123-4567', email: 'robert.c@email.com', address: '789 Pine Ln, Springfield' }, insuranceInfo: { provider: 'UnitedHealth', memberId: 'UH-456789123' } },
            { fullName: 'Elena Rodriguez', dateOfBirth: '1992-06-12', gender: 'Female', contactInfo: { phone: '(555) 234-5678', email: 'elena.r@email.com', address: '321 Elm St, Springfield' }, insuranceInfo: { provider: 'Cigna', memberId: 'CG-555666' } },
            { fullName: 'James Wilson', dateOfBirth: '1965-09-20', gender: 'Male', contactInfo: { phone: '(555) 876-5432', email: 'j.wilson@email.com', address: '555 Cedar Rd, Springfield' }, insuranceInfo: { provider: 'Medicare', memberId: 'MC-777888' } },
            { fullName: 'Linda Thompson', dateOfBirth: '1972-04-05', gender: 'Female', contactInfo: { phone: '(555) 444-3333', email: 'linda.t@email.com', address: '999 Birch Wy, Springfield' }, insuranceInfo: { provider: 'Humana', memberId: 'HM-111222' } },
            { fullName: 'Michael Brown', dateOfBirth: '1980-01-10', gender: 'Male', contactInfo: { phone: '(555) 555-5555', email: 'm.brown@email.com', address: '101 Ash Blvd, Springfield' }, insuranceInfo: { provider: 'BlueShield', memberId: 'BS-999000' } },
            { fullName: 'Sophia Lee', dateOfBirth: '1995-11-25', gender: 'Female', contactInfo: { phone: '(555) 999-8888', email: 'sophia.lee@email.com', address: '202 Willow Dr, Springfield' }, insuranceInfo: { provider: 'Kaiser', memberId: 'KP-333444' } },
            { fullName: 'William Davis', dateOfBirth: '1958-07-30', gender: 'Male', contactInfo: { phone: '(555) 666-7777', email: 'w.davis@email.com', address: '303 Cherry Ct, Springfield' }, insuranceInfo: { provider: 'BlueCross', memberId: 'BC-555444' } },
            { fullName: 'Emily Miller', dateOfBirth: '1990-02-14', gender: 'Female', contactInfo: { phone: '(555) 222-1111', email: 'emily.m@email.com', address: '404 Walnut St, Springfield' }, insuranceInfo: { provider: 'Aetna', memberId: 'AE-888999' } }
        ];

        const createdPatients = [];
        for (const profile of patientProfiles) {
            const patient = await Patient.create({
                doctorId: doctor.id,
                ...profile
            });
            createdPatients.push(patient);
            console.log(`✓ Created patient: ${patient.fullName}`);
        }

        // Create Detailed Visits (Historical and Current)
        console.log('\nCreating Detailed Visits...');

        // Visit 1: David Martinez - Hypertension Management
        const visit1 = await Visit.create({
            patientId: createdPatients[0].id,
            doctorId: doctor.id,
            visitDate: new Date().toISOString(), // Today
            type: 'Follow-up',
            mode: 'In-person',
            location: 'Main Clinic'
        });

        await Visit.update(visit1.visitId, {
            chiefComplaint: {
                primaryConcern: 'High Blood Pressure check',
                duration: '3 months',
                severity: 'Moderate'
            },
            symptoms: [
                { name: 'Headache', onsetDate: '2 days ago', severityScale: 4, frequency: 'Intermittent' }
            ],
            vitals: {
                bloodPressure: '145/90',
                heartRate: '78',
                temperature: '98.6',
                weight: '195',
                height: '70'
            },
            medications: [
                { name: 'Lisinopril', dosage: '10mg', frequency: 'Daily', adherence: 'Taken as prescribed' }
            ],
            clinicalAssessment: {
                primaryDiagnosis: 'Essential Hypertension',
                confidenceLevel: 'High',
                clinicalReasoning: 'BP elevated despite medication. Patient reports high salt intake recently.'
            },
            planOfCare: {
                medicationsPrescribed: [{ name: 'Lisinopril', instructions: 'Increase to 20mg daily' }],
                lifestyleRecommendations: ['Low sodium diet', '30 min daily walk']
            },
            reports: [
                {
                    id: 'rep-1',
                    name: 'Last_Lab_Results.pdf',
                    url: 'http://localhost:3001/reports/david_m_labs.pdf',
                    type: 'application/pdf',
                    uploadedAt: new Date().toISOString(),
                    size: 1024 * 542,
                    extraction: 'Patient shows elevated systolic BP (145 mmHg). Lipid panel within normal limits. Recommend titration of ACE inhibitor.'
                }
            ],
            status: 'completed',
            transcript: [
                { speaker: 'Doctor', text: 'Good morning David, how have you been feeling?', timestamp: Date.now() - 50000 },
                { speaker: 'Patient', text: 'Pretty good roughly, just some headaches lately.', timestamp: Date.now() - 45000 },
                { speaker: 'Doctor', text: 'I see. Your blood pressure is a bit high today at 145/90.', timestamp: Date.now() - 40000 }
            ]
        });
        console.log(`✓ Created visit for David Martinez: Hypertension`);

        // Visit 2: Sarah Williams - Flu Symptoms
        const visit2 = await Visit.create({
            patientId: createdPatients[1].id,
            doctorId: doctor.id,
            visitDate: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
            type: 'Urgent Care',
            mode: 'Telehealth',
            location: 'Virtual'
        });

        await Visit.update(visit2.visitId, {
            chiefComplaint: {
                primaryConcern: 'Fever and Cough',
                duration: '2 days',
                severity: 'High'
            },
            symptoms: [
                { name: 'Fever', onsetDate: '2 days ago', severityScale: 8, frequency: 'Constant' },
                { name: 'Dry Cough', onsetDate: '2 days ago', severityScale: 6, frequency: 'Intermittent' }
            ],
            vitals: {
                temperature: '102.1',
                heartRate: '95',
                respiratoryRate: '20',
                oxygenSaturation: '98'
            },
            clinicalAssessment: {
                primaryDiagnosis: 'Influenza A',
                differentialDiagnoses: ['COVID-19', 'Common Cold'],
                confidenceLevel: 'Medium'
            },
            planOfCare: {
                medicationsPrescribed: [{ name: 'Tamiflu', instructions: '75mg twice daily' }],
                testsOrdered: ['Rapid Flu Test'],
                lifestyleRecommendations: ['Rest', 'Fluids']
            },
            status: 'signed'
        });
        console.log(`✓ Created visit for Sarah Williams: Flu`);

        // Create Appointments for Dashboard
        console.log('\nCreating Today\'s Appointments...');
        const today = new Date().toISOString().split('T')[0];
        
        const times = ['09:00 AM', '10:30 AM', '11:15 AM', '01:30 PM', '02:45 PM', '04:00 PM'];
        const types = ['Follow-up', 'Annual Physical', 'Consultation', 'Lab Review', 'Urgent Care', 'Medication Refill'];
        
        for (let i = 0; i < 6; i++) {
            await Appointment.create({
                doctorId: doctor.id,
                patientId: createdPatients[i].id,
                patientName: createdPatients[i].fullName,
                time: times[i],
                date: today,
                type: types[i],
                status: i === 0 ? 'In Progress' : i < 3 ? 'Confirmed' : 'Pending'
            });
        }

        console.log('\n✅ Enhanced data seeding completed successfully!\n');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}

seedData();
