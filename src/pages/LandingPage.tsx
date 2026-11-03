import { About } from '@/components/landing/About'
import { Faq } from '@/components/landing/Faq'
import { Footer } from '@/components/landing/Footer'
import { Hero } from '@/components/landing/Hero'
import { Program } from '@/components/landing/Program'
import { ProgressRail } from '@/components/landing/ProgressRail'
import { Qiskit } from '@/components/landing/Qiskit'
import { RegisterCta } from '@/components/landing/RegisterCta'

export default function LandingPage() {
  return (
    <>
      <ProgressRail />
      <Hero />
      <About />
      <Program />
      <Qiskit />
      <Faq />
      <RegisterCta />
      <Footer />
    </>
  )
}
