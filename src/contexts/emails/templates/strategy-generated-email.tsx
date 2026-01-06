import { Body, Container, Head, Heading, Html, Link, Preview, Text } from '@react-email/components';

interface StrategyGeneratedEmailProps {
  clientName: string;
  strategyCount: number;
  totalEstimatedSavings: number;
  strategiesUrl: string;
}

export default function StrategyGeneratedEmail({
  clientName,
  strategyCount,
  totalEstimatedSavings,
  strategiesUrl,
}: StrategyGeneratedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>New tax strategies generated for you</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>New Tax Strategies Available</Heading>
          <Text style={text}>Hi {clientName},</Text>
          <Text style={text}>
            Our AI has analyzed your financial profile and generated{' '}
            <strong>{strategyCount}</strong> personalized tax strategies for you.
          </Text>
          <Text style={text}>
            <strong>Estimated Total Savings:</strong> ${totalEstimatedSavings.toLocaleString()}
          </Text>
          <Link href={strategiesUrl} style={button}>
            View Strategies
          </Link>
          <Text style={text}>
            Review these strategies with your tax advisor to maximize your savings.
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
