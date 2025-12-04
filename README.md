# StrokeRehab_FHE

A privacy-preserving post-stroke rehabilitation platform that leverages Fully Homomorphic Encryption (FHE) to provide personalized rehabilitation plans based on encrypted patient assessments. The platform enables secure remote monitoring of rehabilitation progress while ensuring patient health data privacy.

## Project Background

Post-stroke recovery is a complex and individualized process. Traditional rehabilitation platforms face several challenges:

- **Privacy concerns**: Patients may be reluctant to share sensitive health and performance data.  
- **Data security risks**: Centralized storage of rehabilitation data can be vulnerable to breaches.  
- **Limited personalization**: Standardized plans may not fully adapt to individual patient progress.  
- **Remote monitoring challenges**: Clinicians often struggle to track patient progress without access to detailed data.

StrokeRehab_FHE addresses these issues by allowing computation directly on encrypted patient data. FHE enables the system to generate optimal, personalized rehabilitation plans without exposing any sensitive information, maintaining compliance with privacy regulations and fostering patient trust.

## Features

### Core Functionality

- **Encrypted Patient Data Submission**: Patients input motor and cognitive assessment results, fully encrypted before leaving the device.  
- **Personalized Rehabilitation Plan Generation**: FHE computations create individualized training programs based on encrypted data.  
- **Remote Progress Monitoring**: Clinicians can track patient progress via aggregated encrypted insights.  
- **Dynamic Adjustment**: Plans adapt over time as new assessment data is securely processed.

### Privacy & Security

- **Client-Side Encryption**: All patient inputs are encrypted locally before transmission.  
- **Homomorphic Processing**: Allows computation on encrypted data to derive personalized insights without decryption.  
- **Anonymous Participation**: Patients’ identities remain protected.  
- **Immutable Records**: Rehabilitation data and assessment logs cannot be tampered with once submitted.

## Architecture

### Backend

- **FHE Processing Module**: Performs computations on encrypted patient data to generate personalized plans.  
- **Secure Data Storage**: Stores encrypted assessments and progress logs with auditability.  
- **API Layer**: Provides clinicians with aggregated progress metrics without exposing individual patient data.

### Frontend Application

- **Patient Dashboard**: Allows submission of assessments and visualization of progress on personalized exercises.  
- **Clinician Dashboard**: Displays aggregate insights, patient adherence, and recommended adjustments.  
- **Encryption Integration**: Ensures seamless client-side encryption and secure transmission.

## Technology Stack

### Backend

- Python + FHE Libraries: Encrypted computation for personalized rehabilitation plans.  
- PostgreSQL: Secure storage of encrypted patient assessments.  
- FastAPI: Serves secure data and computation results to frontend dashboards.

### Frontend

- React 18 + TypeScript: Interactive and responsive user interface for patients and clinicians.  
- Tailwind CSS: Modern styling and responsive design.  
- Charts & Visualization: Display aggregated progress and trends without revealing sensitive data.

## Installation

### Prerequisites

- Node.js 18+  
- Python 3.10+  
- npm / yarn / pnpm package manager  

### Setup

1. Clone the repository.  
2. Install frontend dependencies: `npm install` or `yarn install`.  
3. Install backend dependencies: `pip install -r requirements.txt`.  
4. Configure environment variables for secure storage and API endpoints.  
5. Start backend: `python main.py`.  
6. Start frontend: `npm start` or `yarn start`.

## Usage

- **Submit Assessments**: Patients enter motor and cognitive evaluations securely.  
- **Receive Personalized Plans**: FHE-based computations provide tailored exercise routines.  
- **Track Progress**: Clinicians view aggregate trends without accessing raw patient data.  
- **Adjust Plans Dynamically**: Plans automatically adapt based on encrypted assessment updates.

## Security Features

- **Encrypted Data Handling**: All patient assessments are encrypted end-to-end.  
- **Homomorphic Computation**: Personalized plans generated without ever decrypting individual data.  
- **Patient Anonymity**: Identity information is never required or stored.  
- **Immutable Records**: Historical assessment and rehabilitation data remain tamper-proof.

## Future Enhancements

- **Real-Time Adaptive Exercises**: Plan updates in near real-time as new patient data arrives.  
- **Integration with Wearables**: Securely gather movement data for more accurate assessments.  
- **Multi-Clinic Deployment**: Support multiple rehabilitation centers while preserving privacy.  
- **Mobile App Interface**: Enable easier access and submission for patients on mobile devices.  
- **AI-Based Insights**: Leverage encrypted AI analytics for predictive rehabilitation optimization.

StrokeRehab_FHE ensures patient-centered post-stroke rehabilitation while fully protecting sensitive health information using cutting-edge FHE technology.
