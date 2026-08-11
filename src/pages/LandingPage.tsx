import { About } from '@/components/landing/About'
import { Footer } from '@/components/landing/Footer'
import { Hardware } from '@/components/landing/Hardware'
import { Hero } from '@/components/landing/Hero'
import { InterferenceDivider } from '@/components/landing/InterferenceDivider'
import { Program } from '@/components/landing/Program'
import { ProgressRail } from '@/components/landing/ProgressRail'
import { Registration } from '@/components/landing/Registration'
import { Sponsor } from '@/components/landing/Sponsor'

export default function LandingPage() {
  return (
    <>
      <ProgressRail />
      <Hero />
      <InterferenceDivider />
      <About />
      <Hardware />
      <Program />
      <Sponsor />
      <Registration />
      <Footer />
    </>
  )
}
