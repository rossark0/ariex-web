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

interface PaymentFailedEmailProps {
  userName?: string;
  appUrl?: string;
}

export default function PaymentFailedEmail({
  userName = 'there',
  appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
}: PaymentFailedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Payment failed - Action required</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Payment Failed</Heading>
          <Text style={text}>Hi {userName},</Text>
          <Text style={text}>
            We were unable to process your recent payment. This could be due to insufficient funds,
            an expired card, or your bank declining the transaction.
          </Text>
          <Text style={text}>
            To avoid any interruption to your service, please update your payment method.
          </Text>
          <Section style={buttonContainer}>
            <Button style={button} href={`${appUrl}/billing`}>
              Update Payment Method
            </Button>
          </Section>
          <Text style={footer}>
            If you have any questions or need assistance, please contact our support team.
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
  backgroundColor: '#dc2626',
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
