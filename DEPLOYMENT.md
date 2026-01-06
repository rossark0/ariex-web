# Deployment Guide

This guide covers deploying your Next.js + oRPC application to various platforms.

## AWS Amplify (Recommended)

AWS Amplify provides excellent support for Next.js with built-in CI/CD.

### Prerequisites
- AWS Account
- GitHub repository
- Environment variables ready

### Deployment Steps

1. **Go to AWS Amplify Console**
   - Visit https://console.aws.amazon.com/amplify/
   - Click "New app" → "Host web app"

2. **Connect Repository**
   - Select GitHub
   - Authorize AWS Amplify
   - Choose your repository
   - Select the branch (e.g., `main` for production)

3. **Configure Build Settings**
   - Amplify will automatically detect `amplify.yml`
   - App name: `ariexai-web` (or your preferred name)
   - Environment: `production`

4. **Add Environment Variables**
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
   CLERK_SECRET_KEY=sk_live_...
   CLERK_WEBHOOK_SECRET=whsec_...
   DATABASE_URL=postgresql://...
   RESEND_API_KEY=re_...
   EMAIL_FROM=noreply@yourdomain.com
   NEXT_PUBLIC_APP_URL=https://yourdomain.com
   ```

5. **Deploy**
   - Click "Save and deploy"
   - Wait for build to complete (~5-10 minutes)
   - Your app will be available at the Amplify domain

### Custom Domain

1. In Amplify Console, go to "Domain management"
2. Click "Add domain"
3. Enter your domain (e.g., `yourdomain.com`)
4. Follow DNS configuration instructions
5. SSL certificate will be provisioned automatically

### Branch Deployments

Configure additional branches for staging/preview:

1. In Amplify Console, go to "App settings" → "Branch detection"
2. Add branches:
   - `main` → Production
   - `develop` → Staging
   - Pull requests → Preview

Each branch gets its own URL:
- Production: `https://main.d1234abcd.amplifyapp.com`
- Staging: `https://develop.d1234abcd.amplifyapp.com`

### Build Specifications

The `amplify.yml` in the root handles:
- Installing pnpm
- Installing dependencies
- Building the Next.js app
- Setting security headers

### Monitoring

- **Build logs**: Available in Amplify Console
- **Access logs**: Enable CloudWatch logs in settings
- **Metrics**: View traffic and performance metrics

---

## Vercel (Alternative)

Vercel is another excellent choice for Next.js applications.

### Prerequisites
- Vercel account
- GitHub repository
- Environment variables ready

### Deployment Steps

1. **Import Project**
   - Visit https://vercel.com/new
   - Import your GitHub repository

2. **Configure Project**
   - Framework preset: Next.js
   - Root directory: `apps/web`
   - Build command: `pnpm run build`
   - Output directory: `.next`

3. **Environment Variables**
   Add the same environment variables as Amplify:
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
   CLERK_SECRET_KEY
   CLERK_WEBHOOK_SECRET
   DATABASE_URL
   RESEND_API_KEY
   EMAIL_FROM
   NEXT_PUBLIC_APP_URL
   ```

4. **Deploy**
   - Click "Deploy"
   - Wait for deployment
   - Your app will be available at the Vercel domain

### Custom Domain

1. Go to Project Settings → Domains
2. Add your custom domain
3. Configure DNS (A/CNAME records)
4. SSL is automatic

### Branch Deployments

Vercel automatically creates preview deployments for:
- Every git push to `main` (Production)
- Every pull request (Preview)

---

## Database Setup (Production)

Choose a PostgreSQL provider for production:

### Option 1: Neon (Recommended for Serverless)

1. Go to https://neon.tech
2. Create new project
3. Copy connection string
4. Add to `DATABASE_URL` environment variable

**Benefits:**
- Serverless (scales to zero)
- Fast cold starts
- Free tier available
- Great for Vercel/Amplify

### Option 2: Supabase

1. Go to https://supabase.com
2. Create new project
3. Get database connection string
4. Add to `DATABASE_URL`

**Benefits:**
- Additional features (Auth, Storage, Realtime)
- Good free tier
- Easy to use

### Option 3: AWS RDS

1. Create RDS PostgreSQL instance
2. Configure security groups
3. Get connection string
4. Add to environment variables

**Benefits:**
- Same AWS account as Amplify
- Predictable pricing
- Full control

---

## Environment-Specific Configuration

### Production Environment Variables

```bash
# Use production Clerk keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...

# Production database
DATABASE_URL=postgresql://user:pass@host:5432/prod_db

# Production domain
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Production email
EMAIL_FROM=noreply@yourdomain.com

# Ensure production mode
NODE_ENV=production
```

### Staging Environment Variables

```bash
# Use test Clerk keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Staging database
DATABASE_URL=postgresql://user:pass@host:5432/staging_db

# Staging domain
NEXT_PUBLIC_APP_URL=https://staging.yourdomain.com
```

---

## Post-Deployment Checklist

### 1. Configure Webhooks

**Clerk Webhooks:**
1. Go to Clerk Dashboard → Webhooks
2. Add endpoint: `https://yourdomain.com/api/clerk/webhook`
3. Select events: `user.created`, `user.updated`, `user.deleted`
4. Copy signing secret to `CLERK_WEBHOOK_SECRET`

**Stripe Webhooks (if using):**
1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://yourdomain.com/api/stripe/webhook`
3. Select events as needed
4. Copy signing secret to environment variables

### 2. Test Core Functionality

- [ ] User sign-up and sign-in
- [ ] API endpoints (oRPC procedures)
- [ ] Email sending
- [ ] Database connections
- [ ] Webhook processing

### 3. Set Up Monitoring

**Option 1: Sentry**
```bash
npm install @sentry/nextjs
```

**Option 2: LogRocket**
```bash
npm install logrocket
```

### 4. Configure DNS

Point your domain to:
- **Amplify**: Follow Amplify DNS instructions
- **Vercel**: Add A/CNAME records as instructed

### 5. SSL Certificate

Both Amplify and Vercel handle SSL automatically:
- Certificates are provisioned automatically
- Auto-renewal is handled
- HTTPS is enforced

### 6. Performance Optimization

- [ ] Enable Edge Middleware for auth
- [ ] Use ISR for static pages
- [ ] Implement image optimization
- [ ] Enable compression
- [ ] Set up CDN (automatic with Amplify/Vercel)

---

## Rollback Strategy

### Amplify
1. Go to App → Deployments
2. Find previous successful deployment
3. Click "Redeploy this version"

### Vercel
1. Go to Project → Deployments
2. Find previous deployment
3. Click "Promote to Production"

---

## CI/CD Pipeline

Both platforms provide automatic CI/CD:

1. **Trigger**: Push to GitHub
2. **Build**: Automatic build on Amplify/Vercel
3. **Test**: Run in build phase (add to `amplify.yml` or `vercel.json`)
4. **Deploy**: Automatic on success
5. **Notify**: Slack/Discord/Email notifications

---

## Cost Estimation

### AWS Amplify
- **Free Tier**: 1000 build minutes/month, 15GB storage, 5GB served
- **Beyond Free Tier**: ~$0.01/build minute, ~$0.15/GB served
- **Estimated**: $10-50/month for small/medium app

### Vercel
- **Hobby (Free)**: Good for personal projects
- **Pro ($20/month)**: Includes more builds, bandwidth, team features
- **Estimated**: $20-100/month depending on usage

### Database (Neon)
- **Free Tier**: 3GB storage, 500MB egress
- **Pro**: $19+/month for production workloads

### Total Estimated Cost
- **Development/Staging**: ~$0-10/month
- **Production (Small)**: ~$30-80/month
- **Production (Medium)**: ~$100-200/month

---

## Troubleshooting

### Build Fails

1. Check build logs in console
2. Verify environment variables are set
3. Test build locally: `pnpm build`
4. Check Node.js version matches

### Runtime Errors

1. Check application logs
2. Verify database connection
3. Test API endpoints with curl/Postman
4. Check Clerk configuration

### Webhook Issues

1. Verify webhook URLs are correct
2. Check webhook signing secrets
3. Review webhook logs in provider dashboard
4. Test with webhook testing tools

---

## Security Best Practices

1. **Environment Variables**
   - Never commit secrets to git
   - Use different keys for staging/production
   - Rotate keys regularly

2. **Database**
   - Use strong passwords
   - Enable SSL connections
   - Restrict IP access if possible

3. **Authentication**
   - Keep Clerk keys secure
   - Monitor authentication logs
   - Set up anomaly detection

4. **API**
   - Implement rate limiting
   - Add request validation
   - Monitor for suspicious activity

---

## Getting Help

- **AWS Amplify**: [Amplify Discord](https://discord.gg/amplify)
- **Vercel**: [Vercel Support](https://vercel.com/support)
- **Next.js**: [Next.js Discussions](https://github.com/vercel/next.js/discussions)
- **oRPC**: [oRPC Documentation](https://orpc.unnoq.com/)

---

Your application is now ready for production! 🚀



