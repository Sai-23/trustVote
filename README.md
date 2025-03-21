# TrustVote Blockchain Voting Application

A secure and transparent blockchain-based voting platform with OTP verification for voter identity.

## OTP Verification System

The application supports two modes for OTP verification:

### Demo Mode

In demo mode, OTP verification is simulated locally without real SMS delivery:
- OTPs are generated on the client-side and displayed on screen
- A fixed test OTP (123456) is always accepted
- No actual SMS messages are sent

This mode is useful for testing and development.

### Production Mode (Firebase Phone Authentication)

In production mode, the application uses Firebase Phone Authentication:
- Real SMS messages are sent to the voter's registered phone number
- Google reCAPTCHA is used to verify the user is not a bot
- OTPs are verified securely through Firebase Authentication
- Full audit trail of verifications is available in Firebase console

### Configuration

To switch between demo and production modes, set the environment variable in `.env.local`:

```
# Set to 'true' for demo mode, 'false' for production Firebase authentication
NEXT_PUBLIC_USE_DEMO_MODE=true
```

### Setting Up Firebase Phone Authentication

To use the production mode with real SMS delivery:

1. Create a Firebase project at https://console.firebase.google.com/
2. Enable Phone Authentication in the Firebase Authentication section
3. Add your app's domain to the authorized domains list
4. Update your `.env.local` file with your Firebase credentials
5. Set `NEXT_PUBLIC_USE_DEMO_MODE=false`
6. Configure Firebase phone authentication pricing and quotas as needed

### Testing Firebase Phone Authentication

When testing with Firebase Phone Authentication:
- Use real phone numbers that can receive SMS
- Be aware of Firebase's quota for SMS verification (free tier limits)
- For development, whitelist test phone numbers in the Firebase console
- Use Firebase test mode for specific test phone numbers

## Additional Features

- Blockchain-based voting ensures transparency and immutability
- Wallet-based voter authentication
- Admin panel for managing candidates and voter registrations
- Biometric verification option for enhanced security

![tw-banner](https://github.com/thirdweb-example/next-starter/assets/57885104/20c8ce3b-4e55-4f10-ae03-2fe4743a5ee8)

# thirdweb-next-starter

Starter template to build an onchain react native app with [thirdweb](https://thirdweb.com/) and [next](https://nextjs.org/).

## Installation

Install the template using [thirdweb create](https://portal.thirdweb.com/cli/create)

```bash
  npx thirdweb create app --next
```

## Environment Variables

To run this project, you will need to add the following environment variables to your .env file:

`CLIENT_ID`

To learn how to create a client ID, refer to the [client documentation](https://portal.thirdweb.com/typescript/v5/client). 

## Run locally

Install dependencies

```bash
yarn
```

Start development server

```bash
yarn dev
```

Create a production build

```bash
yarn build
```

Preview the production build

```bash
yarn start
```

## Resources

- [Documentation](https://portal.thirdweb.com/typescript/v5)
- [Templates](https://thirdweb.com/templates)
- [YouTube](https://www.youtube.com/c/thirdweb)
- [Blog](https://blog.thirdweb.com)

## Need help?

For help or feedback, please [visit our support site](https://thirdweb.com/support)
