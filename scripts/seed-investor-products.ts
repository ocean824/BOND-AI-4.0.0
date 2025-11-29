import { getUncachableStripeClient } from '../server/stripeClient';

async function createInvestorMembershipProducts() {
  console.log('Creating investor membership products in Stripe...');
  
  const stripe = await getUncachableStripeClient();

  // Check if products already exist
  const existingProducts = await stripe.products.search({
    query: "metadata['type']:'investor_membership'"
  });

  if (existingProducts.data.length > 0) {
    console.log('Investor membership products already exist:');
    for (const product of existingProducts.data) {
      const prices = await stripe.prices.list({ product: product.id, active: true });
      console.log(`  - ${product.name}: ${product.id}`);
      for (const price of prices.data) {
        console.log(`    Price: $${(price.unit_amount || 0) / 100}/month - ${price.id}`);
      }
    }
    return;
  }

  // Create Standard Tier ($199/month)
  const standardProduct = await stripe.products.create({
    name: 'Investor Standard Membership',
    description: 'Access to Bond Exchange with standard features. View and bid on perfected judgment bonds.',
    metadata: {
      type: 'investor_membership',
      tier: 'standard',
    }
  });

  const standardPrice = await stripe.prices.create({
    product: standardProduct.id,
    unit_amount: 19900, // $199.00
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: {
      tier: 'standard',
    }
  });

  console.log(`Created Standard Tier: ${standardProduct.id}`);
  console.log(`  Price: $199/month - ${standardPrice.id}`);

  // Create Premium Tier ($299/month)
  const premiumProduct = await stripe.products.create({
    name: 'Investor Premium Membership',
    description: 'Access to Bond Exchange with premium features. Priority access to new listings, detailed analytics, and exclusive auctions.',
    metadata: {
      type: 'investor_membership',
      tier: 'premium',
    }
  });

  const premiumPrice = await stripe.prices.create({
    product: premiumProduct.id,
    unit_amount: 29900, // $299.00
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: {
      tier: 'premium',
    }
  });

  console.log(`Created Premium Tier: ${premiumProduct.id}`);
  console.log(`  Price: $299/month - ${premiumPrice.id}`);

  console.log('\nInvestor membership products created successfully!');
}

createInvestorMembershipProducts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error creating products:', error);
    process.exit(1);
  });
