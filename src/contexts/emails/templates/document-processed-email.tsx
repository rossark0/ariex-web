import { Body, Container, Head, Heading, Html, Link, Preview, Text } from '@react-email/components';

interface DocumentProcessedEmailProps {
  clientName: string;
  documentName: string;
  category: string;
  summary: string;
  documentUrl: string;
}

export default function DocumentProcessedEmail({
  clientName,
  documentName,
  category,
  summary,
  documentUrl,
}: DocumentProcessedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your document has been processed</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Document Processed</Heading>
          <Text style={text}>Hi {clientName},</Text>
          <Text style={text}>
            Your document <strong>{documentName}</strong> has been successfully processed by our AI.
          </Text>
          <Text style={text}>
            <strong>Category:</strong> {category}
          </Text>
          <Text style={text}>
            <strong>Summary:</strong> {summary}
          </Text>
          <Link href={documentUrl} style={button}>
            View Document
          </Link>
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
