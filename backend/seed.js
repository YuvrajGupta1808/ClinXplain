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

        console.log('\n🌱 Starting comprehensive data seeding...\n');

        // Create Doctor with Stable ID
        console.log('Creating Dr. Marcus Thorne...');
        const doctorId = 'd03e839e-1234-5678-90ab-cdef12345678';
        const doctor = await Doctor.create({
            id: doctorId,
            email: 'doctor@clinxplain.com',
            password: 'demo123',
            name: 'Dr. Marcus Thorne',
            specialty: 'Internal Medicine'
        });
        console.log(`✓ Created doctor: ${doctor.name}`);

        // ============================================
        // DETAILED PATIENT PROFILES WITH MEDICAL HISTORY
        // ============================================
        console.log('\n📋 Creating Patients with detailed medical profiles...\n');

        const patientProfiles = [
            // Patient 1: Sarah Williams - Your detailed example
            {
                fullName: 'Sarah Williams',
                dateOfBirth: '1988-12-25',
                gender: 'Female',
                bloodType: 'O+',
                contactInfo: {
                    phone: '(555) 678-9012',
                    email: 'sarah.williams@email.com',
                    address: '456 Maple Avenue, Springfield, CA 94107'
                },
                insuranceInfo: {
                    provider: 'Aetna',
                    memberId: 'AE-987654321',
                    groupNumber: 'GRP-5544'
                },
                medicalHistory: {
                    conditions: ['Asthma', 'Seasonal Allergies'],
                    medications: ['Albuterol inhaler 90mcg as needed'],
                    allergies: ['Penicillin', 'Shellfish'],
                    surgeries: ['Appendectomy (2015)'],
                    familyHistory: ['Father: Type 2 Diabetes', 'Mother: Hypertension']
                },
                emergencyContact: {
                    name: 'John Williams',
                    relationship: 'Spouse',
                    phone: '(555) 678-9013'
                }
            },
            // Patient 2: David Martinez - Hypertension
            {
                fullName: 'David Martinez',
                dateOfBirth: '1978-11-30',
                gender: 'Male',
                bloodType: 'A+',
                contactInfo: {
                    phone: '(555) 345-6789',
                    email: 'david.martinez@email.com',
                    address: '123 Oak Street, Springfield, CA 94108'
                },
                insuranceInfo: {
                    provider: 'BlueCross BlueShield',
                    memberId: 'BC-123456789',
                    groupNumber: 'GRP-1122'
                },
                medicalHistory: {
                    conditions: ['Essential Hypertension', 'Hyperlipidemia', 'Prediabetes'],
                    medications: ['Lisinopril 20mg daily', 'Atorvastatin 10mg daily'],
                    allergies: ['Sulfa drugs'],
                    surgeries: [],
                    familyHistory: ['Father: Heart Disease', 'Mother: Type 2 Diabetes']
                }
            },

            // Patient 3: Robert Chen - Diabetes Management
            {
                fullName: 'Robert Chen',
                dateOfBirth: '1985-03-15',
                gender: 'Male',
                bloodType: 'B+',
                contactInfo: {
                    phone: '(555) 123-4567',
                    email: 'robert.chen@email.com',
                    address: '789 Pine Lane, Springfield, CA 94109'
                },
                insuranceInfo: {
                    provider: 'UnitedHealthcare',
                    memberId: 'UH-456789123',
                    groupNumber: 'GRP-3344'
                },
                medicalHistory: {
                    conditions: ['Type 2 Diabetes Mellitus', 'Obesity', 'Sleep Apnea'],
                    medications: ['Metformin 1000mg twice daily', 'Ozempic 0.5mg weekly'],
                    allergies: [],
                    surgeries: ['Knee arthroscopy (2019)'],
                    familyHistory: ['Both parents: Type 2 Diabetes']
                }
            },
            // Patient 4: Elena Rodriguez - Anxiety/Depression
            {
                fullName: 'Elena Rodriguez',
                dateOfBirth: '1992-06-12',
                gender: 'Female',
                bloodType: 'AB+',
                contactInfo: {
                    phone: '(555) 234-5678',
                    email: 'elena.rodriguez@email.com',
                    address: '321 Elm Street, Springfield, CA 94110'
                },
                insuranceInfo: {
                    provider: 'Cigna',
                    memberId: 'CG-555666777',
                    groupNumber: 'GRP-5566'
                },
                medicalHistory: {
                    conditions: ['Generalized Anxiety Disorder', 'Migraine with Aura'],
                    medications: ['Sertraline 50mg daily', 'Sumatriptan 50mg as needed'],
                    allergies: ['Codeine', 'Latex'],
                    surgeries: [],
                    familyHistory: ['Mother: Depression', 'Grandmother: Alzheimer\'s']
                }
            },

            // Patient 5: James Wilson - Cardiac Patient
            {
                fullName: 'James Wilson',
                dateOfBirth: '1965-09-20',
                gender: 'Male',
                bloodType: 'O-',
                contactInfo: {
                    phone: '(555) 876-5432',
                    email: 'james.wilson@email.com',
                    address: '555 Cedar Road, Springfield, CA 94111'
                },
                insuranceInfo: {
                    provider: 'Medicare',
                    memberId: 'MC-777888999',
                    groupNumber: 'N/A'
                },
                medicalHistory: {
                    conditions: ['Coronary Artery Disease', 'Atrial Fibrillation', 'CHF Stage II'],
                    medications: ['Metoprolol 50mg twice daily', 'Warfarin 5mg daily', 'Furosemide 40mg daily', 'Lisinopril 10mg daily'],
                    allergies: ['Aspirin', 'NSAIDs'],
                    surgeries: ['Coronary Stent Placement (2020)', 'Pacemaker Implant (2022)'],
                    familyHistory: ['Father: MI at age 55', 'Brother: Stroke']
                }
            },
            // Patient 6: Linda Thompson - Rheumatoid Arthritis
            {
                fullName: 'Linda Thompson',
                dateOfBirth: '1972-04-05',
                gender: 'Female',
                bloodType: 'A-',
                contactInfo: {
                    phone: '(555) 444-3333',
                    email: 'linda.thompson@email.com',
                    address: '999 Birch Way, Springfield, CA 94112'
                },
                insuranceInfo: {
                    provider: 'Humana',
                    memberId: 'HM-111222333',
                    groupNumber: 'GRP-7788'
                },
                medicalHistory: {
                    conditions: ['Rheumatoid Arthritis', 'Osteoporosis', 'Hypothyroidism'],
                    medications: ['Methotrexate 15mg weekly', 'Folic acid 1mg daily', 'Levothyroxine 75mcg daily', 'Calcium + Vitamin D'],
                    allergies: ['Ibuprofen'],
                    surgeries: ['Total knee replacement (2021)'],
                    familyHistory: ['Mother: Rheumatoid Arthritis', 'Sister: Lupus']
                }
            },

            // Patient 7: Michael Brown - COPD
            {
                fullName: 'Michael Brown',
                dateOfBirth: '1980-01-10',
                gender: 'Male',
                bloodType: 'B-',
                contactInfo: {
                    phone: '(555) 555-5555',
                    email: 'michael.brown@email.com',
                    address: '101 Ash Boulevard, Springfield, CA 94113'
                },
                insuranceInfo: {
                    provider: 'BlueShield',
                    memberId: 'BS-999000111',
                    groupNumber: 'GRP-9900'
                },
                medicalHistory: {
                    conditions: ['COPD Stage II', 'Former Smoker', 'GERD'],
                    medications: ['Spiriva 18mcg daily', 'Albuterol inhaler PRN', 'Omeprazole 20mg daily'],
                    allergies: [],
                    surgeries: [],
                    familyHistory: ['Father: Lung Cancer']
                }
            },
            // Patient 8: Sophia Lee - Pregnancy
            {
                fullName: 'Sophia Lee',
                dateOfBirth: '1995-11-25',
                gender: 'Female',
                bloodType: 'A+',
                contactInfo: {
                    phone: '(555) 999-8888',
                    email: 'sophia.lee@email.com',
                    address: '202 Willow Drive, Springfield, CA 94114'
                },
                insuranceInfo: {
                    provider: 'Kaiser Permanente',
                    memberId: 'KP-333444555',
                    groupNumber: 'GRP-KP01'
                },
                medicalHistory: {
                    conditions: ['Pregnancy (28 weeks)', 'Gestational Diabetes'],
                    medications: ['Prenatal vitamins daily', 'Insulin as directed'],
                    allergies: ['Erythromycin'],
                    surgeries: [],
                    familyHistory: ['Mother: Gestational Diabetes']
                }
            },

            // Patient 9: William Davis - Prostate Cancer Survivor
            {
                fullName: 'William Davis',
                dateOfBirth: '1958-07-30',
                gender: 'Male',
                bloodType: 'O+',
                contactInfo: {
                    phone: '(555) 666-7777',
                    email: 'william.davis@email.com',
                    address: '303 Cherry Court, Springfield, CA 94115'
                },
                insuranceInfo: {
                    provider: 'BlueCross',
                    memberId: 'BC-555444333',
                    groupNumber: 'GRP-2233'
                },
                medicalHistory: {
                    conditions: ['Prostate Cancer (in remission)', 'BPH', 'Hypertension'],
                    medications: ['Tamsulosin 0.4mg daily', 'Amlodipine 5mg daily'],
                    allergies: ['Contrast dye'],
                    surgeries: ['Radical Prostatectomy (2019)'],
                    familyHistory: ['Father: Prostate Cancer', 'Uncle: Colon Cancer']
                }
            },
            // Patient 10: Emily Miller - Young Adult Wellness
            {
                fullName: 'Emily Miller',
                dateOfBirth: '1990-02-14',
                gender: 'Female',
                bloodType: 'AB-',
                contactInfo: {
                    phone: '(555) 222-1111',
                    email: 'emily.miller@email.com',
                    address: '404 Walnut Street, Springfield, CA 94116'
                },
                insuranceInfo: {
                    provider: 'Aetna',
                    memberId: 'AE-888999000',
                    groupNumber: 'GRP-4455'
                },
                medicalHistory: {
                    conditions: ['PCOS', 'Iron Deficiency Anemia'],
                    medications: ['Oral contraceptive daily', 'Ferrous sulfate 325mg daily'],
                    allergies: ['Amoxicillin'],
                    surgeries: [],
                    familyHistory: ['Mother: Breast Cancer', 'Grandmother: Ovarian Cancer']
                }
            }
        ];

        const createdPatients = [];
        for (const profile of patientProfiles) {
            const patient = await Patient.create({
                doctorId: doctor.id,
                ...profile
            });
            createdPatients.push(patient);
            console.log(`✓ Created patient: ${patient.fullName} (${patient.medicalHistory?.conditions?.join(', ') || 'Healthy'})`);
        }


        // ============================================
        // DETAILED VISITS WITH FULL CLINICAL DATA
        // ============================================
        console.log('\n📝 Creating Detailed Clinical Visits...\n');

        // Visit 1: Sarah Williams - Flu (Your detailed example)
        const visit1 = await Visit.create({
            patientId: createdPatients[0].id,
            doctorId: doctor.id,
            visitDate: new Date().toISOString(),
            type: 'Urgent Care',
            mode: 'In-person',
            location: 'ClinXplain Medical Center'
        });

        await Visit.update(visit1.visitId, {
            chiefComplaint: {
                primaryConcern: 'Fever and dry cough',
                duration: '2 days',
                severity: 'High'
            },
            symptoms: [
                { name: 'Fever', onsetDate: '2 days ago', severityScale: 8, frequency: 'Constant' },
                { name: 'Dry Cough', onsetDate: '2 days ago', severityScale: 6, frequency: 'Intermittent' },
                { name: 'Body Aches', onsetDate: '2 days ago', severityScale: 5, frequency: 'Constant' },
                { name: 'Chills', onsetDate: '2 days ago', severityScale: 4, frequency: 'Intermittent' }
            ],
            vitals: {
                bloodPressure: '118/76',
                heartRate: '95',
                temperature: '102.1',
                respiratoryRate: '20',
                oxygenSaturation: '98',
                weight: '150',
                height: '68'
            },
            medications: [
                { name: 'Albuterol inhaler', dosage: '90 mcg', frequency: 'As needed', instructions: 'Use for wheezing or shortness of breath' }
            ],
            allergies: ['Penicillin', 'Shellfish'],
            clinicalAssessment: {
                primaryDiagnosis: 'Acute viral respiratory infection (suspected influenza)',
                confidenceLevel: 'Medium',
                differentialDiagnoses: ['COVID-19', 'Bacterial pneumonia', 'Common cold'],
                clinicalReasoning: 'Patient presents with acute onset fever and dry cough for two days, associated with body aches and chills. Vital signs notable for fever and mild tachycardia, with normal oxygen saturation and respiratory rate. No signs of respiratory distress or focal lung findings. Clinical presentation is most consistent with a viral etiology, influenza favored given symptom profile and recent exposure history.'
            },
            planOfCare: {
                medicationsPrescribed: [
                    { name: 'Oseltamivir (Tamiflu)', dosage: '75 mg', frequency: 'Twice daily', instructions: 'Take with food for 5 days' },
                    { name: 'Acetaminophen', dosage: '650 mg', frequency: 'Every 6 hours as needed', instructions: 'For fever and body aches' }
                ],
                testsOrdered: ['Rapid Influenza Test', 'COVID-19 PCR'],
                lifestyleRecommendations: ['Rest and adequate hydration', 'Isolate from family members', 'Monitor temperature twice daily']
            },
            insights: {
                recommendedQuestions: [
                    'Has your fever improved after taking medication?',
                    'Are you experiencing any shortness of breath or chest discomfort?',
                    'Has the cough worsened or changed in character?'
                ],
                differentialDiagnoses: [
                    { diagnosis: 'Influenza A/B', confidence: 'High', reasoning: 'Classic presentation with fever, cough, myalgias' },
                    { diagnosis: 'COVID-19', confidence: 'Medium', reasoning: 'Similar presentation, requires testing to rule out' },
                    { diagnosis: 'Bacterial pneumonia', confidence: 'Low', reasoning: 'Normal O2 sat and respiratory rate make this less likely' }
                ],
                nextSteps: [
                    'Monitor temperature and symptoms at home',
                    'Complete prescribed antiviral course',
                    'Seek care if symptoms worsen or breathing difficulty develops',
                    'Follow up in 5-7 days if not improving'
                ]
            },
            status: 'completed',
            transcript: [
                { speaker: 'Doctor', text: 'Good morning Sarah, I see you\'re here for fever and cough. Tell me more about when this started.', timestamp: Date.now() - 300000 },
                { speaker: 'Patient', text: 'It started about 2 days ago. I woke up with chills and a fever, and then the cough started later that day.', timestamp: Date.now() - 280000 },
                { speaker: 'Doctor', text: 'Any shortness of breath or chest pain?', timestamp: Date.now() - 260000 },
                { speaker: 'Patient', text: 'No, just the dry cough and I feel really achy all over.', timestamp: Date.now() - 240000 },
                { speaker: 'Doctor', text: 'Your temperature is 102.1 and your oxygen levels look good at 98%. This looks like influenza.', timestamp: Date.now() - 220000 }
            ]
        });
        console.log(`✓ Created detailed visit for Sarah Williams: Influenza`);


        // Visit 2: David Martinez - Hypertension Follow-up
        const visit2 = await Visit.create({
            patientId: createdPatients[1].id,
            doctorId: doctor.id,
            visitDate: new Date(Date.now() - 86400000).toISOString(),
            type: 'Follow-up',
            mode: 'In-person',
            location: 'ClinXplain Medical Center'
        });

        await Visit.update(visit2.visitId, {
            chiefComplaint: {
                primaryConcern: 'Blood pressure check and medication review',
                duration: 'Ongoing management',
                severity: 'Moderate'
            },
            symptoms: [
                { name: 'Occasional headache', onsetDate: '1 week ago', severityScale: 3, frequency: 'Intermittent' }
            ],
            vitals: {
                bloodPressure: '148/92',
                heartRate: '76',
                temperature: '98.4',
                weight: '198',
                height: '70'
            },
            medications: [
                { name: 'Lisinopril', dosage: '20 mg', frequency: 'Daily', instructions: 'Take in the morning' },
                { name: 'Atorvastatin', dosage: '10 mg', frequency: 'Daily', instructions: 'Take at bedtime' }
            ],
            clinicalAssessment: {
                primaryDiagnosis: 'Essential Hypertension - suboptimally controlled',
                confidenceLevel: 'High',
                clinicalReasoning: 'BP remains elevated at 148/92 despite current medication regimen. Patient admits to high sodium diet and inconsistent exercise. No signs of end-organ damage. Recommend medication adjustment and lifestyle modifications.'
            },
            planOfCare: {
                medicationsPrescribed: [
                    { name: 'Lisinopril', dosage: '40 mg', frequency: 'Daily', instructions: 'Increased dose' },
                    { name: 'Hydrochlorothiazide', dosage: '12.5 mg', frequency: 'Daily', instructions: 'Added for better BP control' }
                ],
                testsOrdered: ['Basic Metabolic Panel', 'Lipid Panel', 'HbA1c'],
                lifestyleRecommendations: ['DASH diet - limit sodium to 2000mg/day', 'Walk 30 minutes daily', 'Reduce alcohol intake', 'Home BP monitoring twice daily']
            },
            insights: {
                recommendedQuestions: [
                    'Are you taking your medication consistently every day?',
                    'How much salt do you typically consume?',
                    'Have you experienced any dizziness or lightheadedness?'
                ],
                differentialDiagnoses: [
                    { diagnosis: 'Essential Hypertension', confidence: 'High', reasoning: 'Long-standing history, family history positive' },
                    { diagnosis: 'Secondary Hypertension', confidence: 'Low', reasoning: 'No clinical features suggesting secondary cause' }
                ],
                nextSteps: [
                    'Recheck BP in 2 weeks',
                    'Review home BP log at next visit',
                    'Consider adding third agent if not at goal'
                ]
            },
            status: 'completed'
        });
        console.log(`✓ Created detailed visit for David Martinez: Hypertension`);


        // Visit 3: Robert Chen - Diabetes Management
        const visit3 = await Visit.create({
            patientId: createdPatients[2].id,
            doctorId: doctor.id,
            visitDate: new Date(Date.now() - 86400000 * 3).toISOString(),
            type: 'Follow-up',
            mode: 'In-person',
            location: 'ClinXplain Medical Center'
        });

        await Visit.update(visit3.visitId, {
            chiefComplaint: {
                primaryConcern: 'Diabetes follow-up and weight management',
                duration: 'Quarterly check',
                severity: 'Moderate'
            },
            vitals: {
                bloodPressure: '132/84',
                heartRate: '82',
                temperature: '98.6',
                weight: '245',
                height: '71'
            },
            medications: [
                { name: 'Metformin', dosage: '1000 mg', frequency: 'Twice daily', instructions: 'With meals' },
                { name: 'Ozempic', dosage: '0.5 mg', frequency: 'Weekly', instructions: 'Subcutaneous injection' }
            ],
            clinicalAssessment: {
                primaryDiagnosis: 'Type 2 Diabetes Mellitus - improving control',
                confidenceLevel: 'High',
                clinicalReasoning: 'HbA1c improved from 8.2% to 7.4% over 3 months. Weight down 8 lbs since starting Ozempic. Patient tolerating medications well. Continue current regimen.'
            },
            planOfCare: {
                medicationsPrescribed: [
                    { name: 'Ozempic', dosage: '1.0 mg', frequency: 'Weekly', instructions: 'Increase dose for continued weight loss' }
                ],
                testsOrdered: ['HbA1c', 'Comprehensive Metabolic Panel', 'Lipid Panel', 'Urine Microalbumin'],
                lifestyleRecommendations: ['Continue low-carb diet', 'Increase physical activity to 150 min/week', 'CPAP compliance for sleep apnea']
            },
            status: 'completed'
        });
        console.log(`✓ Created detailed visit for Robert Chen: Diabetes`);

        // Visit 4: James Wilson - Cardiac Follow-up
        const visit4 = await Visit.create({
            patientId: createdPatients[4].id,
            doctorId: doctor.id,
            visitDate: new Date(Date.now() - 86400000 * 7).toISOString(),
            type: 'Follow-up',
            mode: 'In-person',
            location: 'ClinXplain Medical Center'
        });

        await Visit.update(visit4.visitId, {
            chiefComplaint: {
                primaryConcern: 'Cardiac follow-up and INR check',
                duration: 'Routine monitoring',
                severity: 'Moderate'
            },
            vitals: {
                bloodPressure: '124/78',
                heartRate: '68',
                temperature: '98.2',
                weight: '182',
                height: '72',
                oxygenSaturation: '96'
            },
            medications: [
                { name: 'Metoprolol', dosage: '50 mg', frequency: 'Twice daily' },
                { name: 'Warfarin', dosage: '5 mg', frequency: 'Daily' },
                { name: 'Furosemide', dosage: '40 mg', frequency: 'Daily' },
                { name: 'Lisinopril', dosage: '10 mg', frequency: 'Daily' }
            ],
            clinicalAssessment: {
                primaryDiagnosis: 'Stable CAD with controlled AFib',
                confidenceLevel: 'High',
                clinicalReasoning: 'Patient stable on current regimen. INR therapeutic at 2.4. No chest pain, palpitations, or dyspnea. Pacemaker functioning normally per device check. Continue current management.'
            },
            planOfCare: {
                testsOrdered: ['INR', 'BMP', 'BNP'],
                lifestyleRecommendations: ['Low sodium diet', 'Daily weights', 'Report weight gain >3 lbs']
            },
            status: 'completed'
        });
        console.log(`✓ Created detailed visit for James Wilson: Cardiac`);


        // ============================================
        // TODAY'S APPOINTMENTS
        // ============================================
        console.log('\n📅 Creating Today\'s Appointments...\n');
        const today = new Date().toISOString().split('T')[0];
        
        const appointments = [
            { patientIdx: 0, time: '09:00 AM', type: 'Follow-up', status: 'In Progress', reason: 'Flu follow-up' },
            { patientIdx: 1, time: '09:30 AM', type: 'Follow-up', status: 'Confirmed', reason: 'BP check' },
            { patientIdx: 2, time: '10:00 AM', type: 'Follow-up', status: 'Confirmed', reason: 'Diabetes management' },
            { patientIdx: 3, time: '10:30 AM', type: 'Consultation', status: 'Confirmed', reason: 'Anxiety follow-up' },
            { patientIdx: 4, time: '11:00 AM', type: 'Follow-up', status: 'Pending', reason: 'Cardiac check' },
            { patientIdx: 5, time: '11:30 AM', type: 'Follow-up', status: 'Pending', reason: 'RA management' },
            { patientIdx: 6, time: '01:00 PM', type: 'Follow-up', status: 'Pending', reason: 'COPD check' },
            { patientIdx: 7, time: '01:30 PM', type: 'Prenatal', status: 'Pending', reason: '28-week checkup' },
            { patientIdx: 8, time: '02:00 PM', type: 'Follow-up', status: 'Pending', reason: 'PSA review' },
            { patientIdx: 9, time: '02:30 PM', type: 'Annual Physical', status: 'Pending', reason: 'Wellness exam' }
        ];

        for (const appt of appointments) {
            await Appointment.create({
                doctorId: doctor.id,
                patientId: createdPatients[appt.patientIdx].id,
                patientName: createdPatients[appt.patientIdx].fullName,
                time: appt.time,
                date: today,
                type: appt.type,
                status: appt.status,
                reason: appt.reason
            });
            console.log(`✓ Appointment: ${appt.time} - ${createdPatients[appt.patientIdx].fullName} (${appt.type})`);
        }

        // ============================================
        // SUMMARY
        // ============================================
        console.log('\n' + '='.repeat(60));
        console.log('✅ COMPREHENSIVE DATA SEEDING COMPLETED!');
        console.log('='.repeat(60));
        console.log(`\n📊 Summary:`);
        console.log(`   • 1 Doctor: Dr. Marcus Thorne`);
        console.log(`   • ${createdPatients.length} Patients with detailed medical histories`);
        console.log(`   • 4 Detailed clinical visits with full documentation`);
        console.log(`   • ${appointments.length} Appointments scheduled for today`);
        console.log(`\n🔐 Login Credentials:`);
        console.log(`   Email: doctor@clinxplain.com`);
        console.log(`   Password: demo123`);
        console.log('\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}

seedData();
