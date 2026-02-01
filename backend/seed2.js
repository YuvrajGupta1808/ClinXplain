import { connectRedis } from './src/config/redis.js';
import { Doctor } from './src/models/Doctor.js';
import { Patient } from './src/models/Patient.js';
import { Visit } from './src/models/Visit.js';

async function seedVisits() {
    try {
        await connectRedis();
        console.log('\n🚀 Starting Visit Seeding for existing patients...\n');

        // Find Dr. Marcus Thorne
        const doctor = await Doctor.findByEmail('doctor@clinxplain.com');
        if (!doctor) {
            console.error('❌ Dr. Marcus Thorne not found! Please run seed.js first.');
            process.exit(1);
        }

        // Get all patients
        const patients = await Patient.findByDoctor(doctor.id);
        console.log(`Found ${patients.length} patients for ${doctor.name}`);

        for (const patient of patients) {
            // Check if patient already has visits
            const visits = await Visit.getByPatient(patient.id);
            
            if (visits.length === 0) {
                console.log(`Creating visit for: ${patient.fullName}...`);
                const visit = await Visit.create({
                    patientId: patient.id,
                    doctorId: doctor.id,
                    visitDate: new Date().toISOString(),
                    type: 'Regular Check-up',
                    mode: 'In-person',
                    location: 'Main Clinic'
                });

                // Update with sample clinical data to allow regeneration
                await Visit.update(visit.visitId, {
                    chiefComplaint: {
                        primaryConcern: 'Routine wellness exam',
                        duration: 'N/A',
                        severity: 'Low'
                    },
                    vitals: {
                        bloodPressure: '120/80',
                        heartRate: '72',
                        temperature: '98.6'
                    },
                    status: 'completed',
                    transcript: [
                        { speaker: 'Doctor', text: 'Hello, how are you today?', timestamp: Date.now() - 30000 },
                        { speaker: 'Patient', text: 'I am doing well, just here for my checkup.', timestamp: Date.now() - 25000 },
                        { speaker: 'Doctor', text: 'Great. Everything looks good with your vitals.', timestamp: Date.now() - 20000 }
                    ]
                });
                console.log(`✓ Created visit for ${patient.fullName}`);
            } else {
                console.log(`Skipping ${patient.fullName} (already has ${visits.length} visit(s))`);
            }
        }

        console.log('\n✅ Visit seeding completed successfully!\n');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}

seedVisits();
