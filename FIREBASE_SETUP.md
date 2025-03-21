# Firebase Integration Guide for Blockchain Voting System

This guide will help you integrate Firebase with your Blockchain Voting application to store voter registration data.

## Prerequisites

- A Google account
- Node.js and npm installed on your machine (already required for the project)

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click on "Add project"
3. Enter a project name (e.g., "blockchain-voting")
4. Choose whether to enable Google Analytics (recommended but optional)
5. Click "Create project"

## Step 2: Set Up Firebase for Web

1. In your Firebase project dashboard, click on the web icon (</>) to add a web app
2. Register your app with a nickname (e.g., "blockchain-voting-web")
3. Optionally, check the "Set up Firebase Hosting" box
4. Click "Register app"
5. You'll see a configuration object that looks like this:

```js
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "your-messaging-sender-id",
  appId: "your-app-id"
};
```

6. Copy these values for the next step

## Step 3: Add Firebase Configuration to Your Project

1. In your project, open the `.env.local` file
2. Add the following lines, replacing with your values:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

## Step 4: Set Up Firestore Database

1. In the Firebase Console, navigate to "Firestore Database"
2. Click "Create database"
3. Choose "Start in production mode" or "Start in test mode" (for development)
   - For this guide, we'll select "Start in test mode" for easy development
4. Choose a location for your database (select the one closest to your users)
5. Click "Enable"

## Step 5: Set Up Firestore Rules

1. In the Firestore Database section, go to the "Rules" tab
2. Update the rules to secure your database. For development, you can use:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /voters/{address} {
      allow read: if true;
      allow write: if true;
    }
  }
}
```

3. For production, consider more secure rules like:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /voters/{address} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

## Step 6: Install Firebase SDK

The Firebase SDK is already installed in your project. If it's not, run:

```bash
npm install firebase
```

## Step 7: Test the Integration

1. Start your development server:

```bash
npm run dev
```

2. Navigate to the voter registration page
3. Fill out the form and submit it
4. Check your Firebase Firestore Database to see if the data is being stored correctly

## Troubleshooting

- **Data not appearing in Firestore**: Check your browser console for errors
- **Permissions errors**: Make sure your Firestore rules allow reads and writes
- **Configuration errors**: Verify that your environment variables match your Firebase project settings

## Next Steps

- Implement authentication for additional security
- Set up Firebase Storage for storing larger biometric data
- Configure Firebase Functions for server-side logic

By following these steps, you've successfully integrated Firebase to store voter registration data in your Blockchain Voting application! 