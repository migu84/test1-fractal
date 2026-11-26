/**
 * azure.ts — instantiate the governed data processing platform on Azure.
 *
 * Specializes the vendor-agnostic Fractal (see ./fractal.ts), maps every
 * component to an Azure offer, registers the blueprint and deploys the
 * LiveSystem. The `select` map below is the only Azure-specific code.
 *
 *   npm run deploy
 */
import {fatal} from './fatal';
import {authorFractal} from './fractal';
import {
  createFractalCloudClient,
  AzureDatabricks,
  AzureDatabricksCluster,
  AzureDatabricksJob,
  AzureDatabricksMlflow,
  AzureDatalake,
} from '@fractal_cloud/sdk/model';

const environment = {
  ownerType: 'Organizational',
  ownerId: process.env['OWNER_ID'] ?? '',
  name: process.env['ENVIRONMENT_NAME'] || 'dev',
};

const credentials = {
  clientId: process.env['SERVICE_ACCOUNT_ID']!,
  clientSecret: process.env['SERVICE_ACCOUNT_SECRET']!,
};

const cloud = createFractalCloudClient(credentials);

async function main() {
  // GitHub passes an unset variable as an empty string, which would build
  // the path "Organizational///..." and surface as an opaque 404. Fail early.
  const missing = [
    'SERVICE_ACCOUNT_ID',
    'SERVICE_ACCOUNT_SECRET',
    'OWNER_ID',
  ].filter(name => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`missing required variables: ${missing.join(', ')}`);
  }

  const fractal = authorFractal();
  const liveSystem = fractal
    .specialize()
    .withClusterName('analytics')
    .withJobSchedule('0 9 * * MON-FRI')
    .withExperimentName('fraud')
    .toLiveSystem({
      name: process.env['LIVE_SYSTEM_NAME'] ?? 'data-processing-platform',
      environment,
      select: {
        'analytics-workspace': AzureDatabricks({pricingTier: 'premium'}),
        'analytics-cluster': AzureDatabricksCluster({}),
        'etl-job': AzureDatabricksJob({}),
        'fraud-model': AzureDatabricksMlflow({}),
        // Azure storage account: GLOBALLY unique id, see fractal.ts.
        acmebigdatalake: AzureDatalake({}),
      },
    });

  const bc = liveSystem.boundedContext;
  console.log(
    'LIVE_SYSTEM_ID=' +
      [
        bc.ownerType ?? 'Organizational',
        bc.ownerId ?? '',
        bc.name ?? '',
        liveSystem.name,
      ].join('/'),
  );

  // A blueprint and a LiveSystem are different entities. Register the
  // reusable, vendor-agnostic blueprint first; the API rejects a LiveSystem
  // whose Fractal is not registered.
  await cloud.blueprints.create(fractal);
  await cloud.liveSystems.deploy(liveSystem, {
    mode: (process.env['DEPLOY_MODE'] as 'wait' | 'fire-and-forget') ?? 'wait',
  });
}

main().catch(fatal);
