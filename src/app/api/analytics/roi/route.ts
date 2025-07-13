import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/shared/lib/supabase/server';
import { BusinessIntelligenceService } from '@/lib/analytics/businessIntelligence';

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const bi = new BusinessIntelligenceService(supabase);

  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'monthly';
    const reportType = searchParams.get('type') || 'roi';
    const startDate = searchParams.get('start') ? new Date(searchParams.get('start')!) : undefined;
    const endDate = searchParams.get('end') ? new Date(searchParams.get('end')!) : undefined;

    let report;

    switch (reportType) {
      case 'time-savings':
        report = await bi.calculateTimeSavings(
          period as any,
          startDate,
          endDate
        );
        break;

      case 'accuracy':
        report = await bi.calculateAccuracyImprovements(
          period as any,
          startDate,
          endDate
        );
        break;

      case 'productivity':
        report = await bi.calculateUserProductivity(
          period as any,
          startDate,
          endDate
        );
        break;

      case 'roi':
      default:
        report = await bi.generateROIReport(
          period as 'monthly' | 'quarterly' | 'annual',
          startDate,
          endDate
        );
        break;
    }

    return NextResponse.json({
      success: true,
      report,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating ROI report:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate report',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const bi = new BusinessIntelligenceService(supabase);

  try {
    const { reportType, period, customConfig } = await request.json();

    // Generate comprehensive business intelligence report
    const reports = await Promise.all([
      bi.calculateTimeSavings(period),
      bi.calculateAccuracyImprovements(period),
      bi.calculateUserProductivity(period),
      bi.generateROIReport(period)
    ]);

    const [timeSavings, accuracy, productivity, roi] = reports;

    // Calculate summary metrics
    const summary = {
      totalCostSavings: timeSavings.totalCostSavings + accuracy.costSavingsFromAccuracy,
      monthlyROI: roi.monthlyROI,
      paybackPeriod: roi.paybackPeriod,
      libraryAdoption: timeSavings.libraryUsageRate,
      userSatisfaction: productivity.userSatisfactionScore,
      accuracyImprovement: accuracy.accuracyImprovement,
      productivityGain: (productivity.averageTasksPerHour / 0.5) * 100, // vs baseline
      riskLevel: calculateOverallRisk(roi)
    };

    // Store report in database for future reference
    const { data: savedReport, error } = await supabase
      .from('business_intelligence_reports')
      .insert({
        report_type: 'comprehensive',
        period,
        report_data: {
          timeSavings,
          accuracy,
          productivity,
          roi,
          summary
        },
        generated_at: new Date().toISOString(),
        generated_by: null // Would get from auth
      })
      .select()
      .single();

    if (error) {
      console.warn('Could not save report to database:', error);
    }

    return NextResponse.json({
      success: true,
      reports: {
        timeSavings,
        accuracy,
        productivity,
        roi
      },
      summary,
      reportId: savedReport?.id,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating comprehensive BI report:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate comprehensive report',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function calculateOverallRisk(roi: any): 'low' | 'medium' | 'high' {
  const riskFactors = [roi.adoptionRisk, roi.technologyRisk, roi.operationalRisk];
  const highRiskCount = riskFactors.filter(risk => risk === 'high').length;
  const mediumRiskCount = riskFactors.filter(risk => risk === 'medium').length;

  if (highRiskCount >= 2) return 'high';
  if (highRiskCount === 1 || mediumRiskCount >= 2) return 'medium';
  return 'low';
}