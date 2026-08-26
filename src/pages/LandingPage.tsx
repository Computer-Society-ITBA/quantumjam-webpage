import { About } from '@/components/landing/About'
import { Footer } from '@/components/landing/Footer'
import { Hardware } from '@/components/landing/Hardware'
import { Hero } from '@/components/landing/Hero'
import { Program } from '@/components/landing/Program'
import { ProgressRail } from '@/components/landing/ProgressRail'
import { RegisterCta } from '@/components/landing/RegisterCta'
import { Sponsor } from '@/components/landing/Sponsor'

export default function LandingPage() {
  return (
    <>
      <ProgressRail />
      <Hero />
      <About />
      <Program />
      <Hardware />
      <Sponsor />
      <RegisterCta />
      <Footer />
    </>
  )
}
