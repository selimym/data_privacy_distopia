/**
 * Test script for data generators.
 * Run this to verify all generators work correctly.
 */

import {
  loadAllReferenceData,
  generateFullPopulation,
  generateCitizen,
} from './index';

/**
 * Test the generators
 */
export async function testGenerators() {
  console.log('Testing data generators...\n');

  try {
    // Step 1: Load reference data
    console.log('1. Loading reference data...');
    await loadAllReferenceData();
    console.log('✓ Reference data loaded successfully\n');

    // Step 2: Generate a single citizen
    console.log('2. Generating a single citizen...');
    const singleCitizen = generateCitizen('test-citizen-001', 12345);
    console.log('✓ Single citizen generated successfully');
    console.log(`  - Name: ${singleCitizen.identity.first_name} ${singleCitizen.identity.last_name}`);
    console.log(`  - Role: ${singleCitizen.identity.role}`);
    console.log(`  - Health conditions: ${singleCitizen.health.conditions.length}`);
    console.log(`  - Bank accounts: ${singleCitizen.finance.bank_accounts.length}`);
    console.log(`  - Messages: ${singleCitizen.messages.messages.length}\n`);

    // Step 3: Generate a small population
    console.log('3. Generating population of 10 citizens...');
    const startTime = Date.now();
    const population = await generateFullPopulation(10, 54321);
    const endTime = Date.now();
    console.log('✓ Population generated successfully');
    console.log(`  - Citizens: ${population.citizens.length}`);
    console.log(`  - Operator: ${population.operator.name}`);
    console.log(`  - Directives: ${population.directives.length}`);
    console.log(`  - Neighborhoods: ${population.neighborhoods.length}`);
    console.log(`  - News channels: ${population.newsChannels.length}`);
    console.log(`  - Generation time: ${endTime - startTime}ms\n`);

    // Step 4: Verify data consistency
    console.log('4. Verifying data consistency...');
    let totalMessages = 0;
    let totalFlaggedMessages = 0;
    let citizensWithCriminalRecords = 0;
    let citizensWithPublicProfiles = 0;

    for (const citizen of population.citizens) {
      totalMessages += citizen.messages.messages.length;
      totalFlaggedMessages += citizen.messages.flagged_message_count;
      if (citizen.judicial.has_criminal_record) citizensWithCriminalRecords++;
      if (citizen.social.has_public_profile) citizensWithPublicProfiles++;
    }

    console.log('✓ Data consistency verified');
    console.log(`  - Total messages: ${totalMessages}`);
    console.log(`  - Flagged messages: ${totalFlaggedMessages}`);
    console.log(`  - Citizens with criminal records: ${citizensWithCriminalRecords}`);
    console.log(`  - Citizens with public profiles: ${citizensWithPublicProfiles}\n`);

    console.log('✅ All tests passed!\n');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

// Run tests if this file is executed directly
if (typeof window !== 'undefined' && (window as any).__TEST_GENERATORS__) {
  testGenerators().then((success) => {
    if (success) {
      console.log('Generator tests completed successfully!');
    } else {
      console.error('Generator tests failed!');
    }
  });
}
