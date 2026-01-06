import { Body, Container, Head, Heading, Html, Link, Preview, Text } from '@react-email/components';

interface ClientCreatedEmailProps {
  clientName: string;
  email: string;
  tempPassword: string;
  loginUrl: string;
}

export default function ClientCreatedEmail({
  clientName,
  email,
  tempPassword,
  loginUrl,
}: ClientCreatedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your Ariex AI account has been created</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Welcome to Ariex AI</Heading>
          <Text style={text}>Hi {clientName},</Text>
          <Text style={text}>Your tax strategist has created an account for you on Ariex AI.</Text>
          <Text style={text}>
            <strong>Email:</strong> {email}
            <br />
            <strong>Temporary Password:</strong> {tempPassword}
          </Text>
          <Link href={loginUrl} style={button}>
            Log in to your account
          </Link>
          <Text style={text}>Please change your password after logging in for the first time.</Text>
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
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
};

const button = {
  backgroundColor: '#18181b',
  borderRadius: '5px',
  color: '#fff',
  display: 'inline-block',
  fontSize: '16px',
  fontWeight: 'bold',
  padding: '12px 24px',
  textDecoration: 'none',
  marginTop: '16px',
};
