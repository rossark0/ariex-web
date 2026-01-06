import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface TrialStartedEmailProps {
  userName?: string;
  trialDays?: number;
  appUrl?: string;
}

export default function TrialStartedEmail({
  userName = 'there',
  trialDays = 14,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
}: TrialStartedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your {String(trialDays)}-day trial has started</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Your trial has started!</Heading>
          <Text style={text}>Hi {userName},</Text>
          <Text style={text}>
            Your {String(trialDays)}-day free trial has begun. You now have full access to all
            premium features.
          </Text>
          <Text style={text}>
            Make the most of your trial by exploring everything we have to offer.
          </Text>
          <Section style={buttonContainer}>
            <Button style={button} href={`${appUrl}/dashboard`}>
              Start Exploring
            </Button>
          </Section>
          <Text style={footer}>
            Your trial will automatically expire in {trialDays} days. No credit card required.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
  textAlign: 'center' as const,
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
  padding: '0 40px',
};

const buttonContainer = {
  padding: '27px 0 27px',
  textAlign: 'center' as const,
};

const button = {
  backgroundColor: '#000',
  borderRadius: '5px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 20px',
};

const footer = {
  color: '#8898aa',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '16px 0',
  padding: '0 40px',
  textAlign: 'center' as const,
};
