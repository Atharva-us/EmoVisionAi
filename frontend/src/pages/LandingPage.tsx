import { CtaSection } from '../components/landing/CtaSection';
import { EvaluationSection } from '../components/landing/EvaluationSection';
import { FeatureSection } from '../components/landing/FeatureSection';
import { HeroSection } from '../components/landing/HeroSection';
import { PipelineSection } from '../components/landing/PipelineSection';
import { ResponsibleAISection } from '../components/landing/ResponsibleAISection';

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <FeatureSection />
      <PipelineSection />
      <EvaluationSection />
      <ResponsibleAISection />
      <CtaSection />
    </>
  );
}
