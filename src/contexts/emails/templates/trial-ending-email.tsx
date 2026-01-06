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

interface TrialEndingEmailProps {
  userName?: string;
  daysLeft?: number;
  appUrl?: string;
}

export default function TrialEndingEmail({
  userName = 'there',
  daysLeft = 3,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
}: TrialEndingEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your trial ends in {String(daysLeft)} days</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Your trial is ending soon</Heading>
          <Text style={text}>Hi {userName},</Text>
          <Text style={text}>
            This is a friendly reminder that your free trial will end in {String(daysLeft)} days.
          </Text>
          <Text style={text}>
            To continue enjoying all the premium features, upgrade to a paid plan today.
          </Text>
          <Section style={buttonContainer}>
            <Button style={button} href={`${appUrl}/pricing`}>
              View Pricing
            </Button>
          </Section>
          <Text style={footer}>
            Don&apos;t worry - you can continue using the free plan after your trial ends.
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
