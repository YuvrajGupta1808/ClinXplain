import { client, connectRedis } from './src/config/redis.js';
import { Appointment } from './src/models/Appointment.js';
import { Doctor } from './src/models/Doctor.js';
import { Patient } from './src/models/Patient.js';

async function seedData() {
    try {
        await connectRedis();
        console.log('\n🧹 Clearing previous data...\n');
        
        // Clear all keys to have a fresh start for the new example
        const keys = await client.keys('*');
        if (keys.length > 0) {
            await client.del(keys);
            console.log(`✓ Deleted ${keys.length} keys`);
        }

        console.log('\n🌱 Starting enhanced data seeding...\n');

        // Create a new demo doctor
        console.log('Creating new demo doctor (Orthopedic Surgery)...');
        const doctor = await Doctor.create({
            email: 'doctor@clinxplain.com',
            password: 'demo123',
            name: 'Dr. Marcus Thorne',
            specialty: 'Orthopedic Surgery'
        });
        console.log('✓ Created doctor:', doctor.name);

        // Create a larger pool of patients
        console.log('\nCreating 12 patients...');
        const patients = [];
        
        const patientData = [
            { name: 'Robert Chen', phone: '(555) 123-4567', dateOfBirth: '1985-03-15' },
            { name: 'Lisa Anderson', phone: '(555) 234-5678', dateOfBirth: '1990-07-22' },
            { name: 'David Martinez', phone: '(555) 345-6789', dateOfBirth: '1978-11-30' },
            { name: 'Emily Taylor', phone: '(555) 456-7890', dateOfBirth: '1995-05-18' },
            { name: 'Michael Johnson', phone: '(555) 567-8901', dateOfBirth: '1982-09-10' },
            { name: 'Sarah Williams', phone: '(555) 678-9012', dateOfBirth: '1988-12-25' },
            { name: 'James Wilson', phone: '(555) 789-0123', dateOfBirth: '1965-01-12' },
            { name: 'Maria Garcia', phone: '(555) 890-1234', dateOfBirth: '1980-04-05' },
            { name: 'Kevin Lee', phone: '(555) 901-2345', dateOfBirth: '1992-08-22' },
            { name: 'Amanda White', phone: '(555) 012-3456', dateOfBirth: '1987-11-09' },
            { name: 'Thomas Brown', phone: '(555) 123-4567', dateOfBirth: '1975-06-30' },
            { name: 'Jennifer Davis', phone: '(555) 234-5678', dateOfBirth: '1998-02-14' },
        ];

        for (const data of patientData) {
            const patient = await Patient.create({
                doctorId: doctor.id,
                ...data,
                email: `${data.name.toLowerCase().replace(' ', '.')}@email.com`
            });
            patients.push(patient);
            console.log(`✓ Created patient: ${patient.name}`);
        }

        // Update last visit times for variety
        await Patient.updateLastVisit(patients[0].id, '1 hour ago');
        await Patient.updateLastVisit(patients[1].id, '3 hours ago');
        await Patient.updateLastVisit(patients[2].id, 'Yesterday');
        await Patient.updateLastVisit(patients[3].id, '2 days ago');
        await Patient.updateLastVisit(patients[4].id, '4 days ago');
        await Patient.updateLastVisit(patients[5].id, 'Last week');

        // Create appointments for today (morning and afternoon blocks)
        console.log('\nCreating today\'s appointments...');
        const today = new Date().toISOString().split('T')[0];
        
        const appointments = [
            { time: '08:30 AM', patientIdx: 0, type: 'Post-op Follow-up', status: 'Completed' },
            { time: '09:15 AM', patientIdx: 6, type: 'ACL Consultation', status: 'Completed' },
            { time: '10:00 AM', patientIdx: 1, type: 'Knee X-ray Review', status: 'Confirmed' },
            { time: '11:00 AM', patientIdx: 7, type: 'Shoulder Pain', status: 'Confirmed' },
            { time: '01:30 PM', patientIdx: 2, type: 'Fracture Check', status: 'Confirmed' },
            { time: '02:15 PM', patientIdx: 8, type: 'Sports Injury', status: 'Pending' },
            { time: '03:00 PM', patientIdx: 3, type: 'Routine Check-up', status: 'Confirmed' },
            { time: '03:45 PM', patientIdx: 4, type: 'Spinal Alignment', status: 'Confirmed' },
            { time: '04:15 PM', patientIdx: 9, type: 'Hip Consultation', status: 'Confirmed' },
            { time: '05:00 PM', patientIdx: 5, type: 'Arthritis Review', status: 'Pending' },
            { time: '05:30 PM', patientIdx: 10, type: 'Elbow Tendonitis', status: 'Pending' },
        ];

        for (const apt of appointments) {
            const appointment = await Appointment.create({
                doctorId: doctor.id,
                patientId: patients[apt.patientIdx].id,
                patientName: patients[apt.patientIdx].name,
                time: apt.time,
                date: today,
                type: apt.type,
                status: apt.status
            });
            console.log(`✓ Created appointment: ${appointment.time} - ${appointment.patientName}`);
        }

        console.log('\n✅ Enhanced data seeding completed successfully!\n');
        console.log('New Demo Credentials:');
        console.log('  Email: doctor@clinxplain.com');
        console.log('  Password: demo123\n');
        console.log('  Doctor: Dr. Marcus Thorne (Orthopedic Surgery)\n');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}

seedData();
