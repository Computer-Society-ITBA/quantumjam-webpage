import katex from 'katex'
import 'katex/dist/katex.min.css'
import { useEffect, useState } from 'react'
import type { ReactNode, SyntheticEvent } from 'react'
import { Link } from 'react-router'

import { Footer } from '@/components/landing/Footer'

// The challenge statement is published only in Spanish, as handed to the
// teams, so its copy lives here instead of the i18n bundles.

const DISPLAY_FONT = { fontVariationSettings: '"wdth" 104, "wght" 800' }
const ANGSTROM = '\\text{Å}'

const blockCopy = (event: SyntheticEvent) => event.preventDefault()

function M({ children }: { children: string }) {
  return (
    <span
      dangerouslySetInnerHTML={{
        __html: katex.renderToString(children, { throwOnError: false }),
      }}
    />
  )
}

function MBlock({ children }: { children: string }) {
  return (
    <div
      className="bg-brand-panel border-brand-line my-5 overflow-x-auto border px-4 py-4"
      dangerouslySetInnerHTML={{
        __html: katex.renderToString(children, {
          displayMode: true,
          throwOnError: false,
        }),
      }}
    />
  )
}

const SECTIONS = [
  { id: 'motivacion', title: 'Motivación' },
  { id: 'desafio', title: 'El desafío' },
  { id: 'reglas', title: 'Reglas' },
  { id: 'entrega', title: 'Entrega' },
  { id: 'extras', title: 'Cosas extra' },
  { id: 'evaluacion', title: 'Evaluación' },
  { id: 'recursos', title: 'Recursos' },
] as const

type SectionId = (typeof SECTIONS)[number]['id']

const sectionIndex = (i: number) => String(i + 1).padStart(2, '0')

/** Id of the section currently crossing the upper part of the viewport. */
function useActiveSection() {
  const [active, setActive] = useState<SectionId>(SECTIONS[0].id)

  useEffect(() => {
    // The last sections are too short to reach the top of the viewport, so
    // at the bottom of the page the section named in the URL hash wins.
    const update = () => {
      const line = window.innerHeight * 0.3
      let current: SectionId = SECTIONS[0].id
      for (const { id } of SECTIONS) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top <= line) current = id
      }
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 4
      const hashed = SECTIONS.find((s) => `#${s.id}` === window.location.hash)
      const hashedTop = hashed
        ? document.getElementById(hashed.id)?.getBoundingClientRect().top
        : undefined
      if (
        atBottom &&
        hashed &&
        hashedTop !== undefined &&
        hashedTop < window.innerHeight
      ) {
        current = hashed.id
      }
      setActive(current)
    }

    const target = window.location.hash.slice(1)
    if (target) document.getElementById(target)?.scrollIntoView()
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('hashchange', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('hashchange', update)
    }
  }, [])

  return active
}

function SectionNav({ active }: { active: SectionId }) {
  return (
    <nav
      aria-label="Secciones"
      className="sticky top-10 mt-[7.5rem] hidden w-[190px] shrink-0 self-start lg:block"
    >
      <ol className="border-brand-line flex flex-col border-l">
        {SECTIONS.map(({ id, title }, i) => {
          const current = id === active
          return (
            <li key={id}>
              <a
                href={`#${id}`}
                aria-current={current ? 'location' : undefined}
                className={`-ml-px flex gap-3 border-l py-1.5 pl-4 text-[0.92rem] transition-colors ${
                  current
                    ? 'border-brand-green text-foreground'
                    : 'text-brand-text-faint hover:text-brand-text-dim border-transparent'
                }`}
              >
                <span
                  className={`tabular-nums ${current ? 'text-brand-green' : ''}`}
                >
                  {sectionIndex(i)}
                </span>
                {title}
              </a>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function Section({ id, children }: { id: SectionId; children: ReactNode }) {
  const i = SECTIONS.findIndex((s) => s.id === id)
  const index = sectionIndex(i)
  const { title } = SECTIONS[i]
  return (
    <section
      id={id}
      className="border-brand-line mt-16 scroll-mt-6 border-t pt-10"
    >
      <span className="text-brand-green mb-2 block text-[1.05rem] font-medium tracking-[0.2em]">
        {index}
      </span>
      <h2
        className="font-display text-foreground mb-6 text-[clamp(1.5rem,3vw,2.15rem)] leading-none font-extrabold tracking-[-0.02em] uppercase"
        style={DISPLAY_FONT}
      >
        {title}
      </h2>
      {children}
    </section>
  )
}

function Sub({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-foreground mt-9 mb-3 text-[1.15rem] font-semibold">
      {children}
    </h3>
  )
}

function P({ children }: { children: ReactNode }) {
  return <p className="mb-4">{children}</p>
}

function Bullets({ children }: { children: ReactNode }) {
  return (
    <ul className="marker:text-brand-text-faint mb-4 flex list-disc flex-col gap-3 pl-5">
      {children}
    </ul>
  )
}

function Steps({ children }: { children: ReactNode }) {
  return (
    <ol className="marker:text-brand-text-faint mb-4 flex list-decimal flex-col gap-3 pl-5 marker:font-semibold">
      {children}
    </ol>
  )
}

function B({ children }: { children: ReactNode }) {
  return <strong className="text-foreground font-semibold">{children}</strong>
}

function Ext({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-brand-green decoration-brand-green/40 hover:decoration-brand-green underline underline-offset-3 transition-colors"
    >
      {children}
    </a>
  )
}

/** Quantum Jam 2026 challenge statement: H4 dissociation curve with VQE. */
export default function ChallengePage() {
  const active = useActiveSection()
  return (
    <>
      <main
        className="relative z-10 min-h-screen px-[clamp(16px,5vw,64px)] pt-8 pb-24 select-none"
        onCopy={blockCopy}
        onCut={blockCopy}
        onContextMenu={blockCopy}
        onDragStart={blockCopy}
      >
        <div className="mx-auto flex w-full max-w-[1010px] justify-center gap-14">
          <SectionNav active={active} />
          <article className="text-brand-text-dim w-full max-w-[760px] min-w-0 text-[1.02rem] leading-[1.75]">
            <header>
              <Link
                to="/"
                className="text-brand-text-dim hover:text-brand-green mb-16 inline-flex items-center gap-2 text-[1.05rem] leading-none transition-colors"
              >
                <span aria-hidden="true" className="text-[1.3rem] leading-none">
                  ⟨
                </span>
                Inicio
              </Link>
              <span className="text-brand-green mb-4 block text-[1.05rem] font-medium tracking-[0.2em] uppercase">
                Quantum Jam 2026
              </span>
              <h1
                className="font-display text-foreground text-[clamp(2.1rem,6vw,3.6rem)] leading-[1.02] font-extrabold tracking-[-0.02em] uppercase"
                style={DISPLAY_FONT}
              >
                Romper una molécula, un qubit a la vez
              </h1>
            </header>

            <Section id="motivacion">
              <P>
                Más o menos la mitad de la comida del mundo depende de
                fertilizantes hechos con amoníaco, y el amoníaco se fabrica con
                el proceso Haber-Bosch: se rompen moléculas de nitrógeno a unos
                450 °C y a cientos de atmósferas de presión. Solo ese proceso se
                lleva cerca del 1-2 % de toda la energía que consume la
                humanidad. Mientras tanto, unas bacterias que viven en las
                raíces de la soja hacen lo mismo a temperatura ambiente, gracias
                a una enzima (la nitrogenasa). Si entendiéramos exactamente cómo
                lo logran, podríamos diseñar catalizadores que hagan
                fertilizante gastando una fracción de esa energía.
              </P>
              <P>
                ¿Por qué no lo sabemos todavía? Porque para eso hay que calcular
                con mucha precisión la energía de los electrones mientras se
                rompe un enlace, y justamente ahí es donde las computadoras
                clásicas no dan abasto. El mismo problema aparece al diseñar
                baterías para celulares y autos eléctricos o al predecir cómo un
                medicamento se une a una proteína. Es uno de los casos de uso
                más prometedores de las computadoras cuánticas.
              </P>
              <P>
                Obviamente, en esta Jam no vamos a resolver la nitrogenasa. Pero
                la pregunta de fondo es la misma, y la podemos atacar con una
                molécula de juguete: cuatro hidrógenos en fila.
              </P>

              <Sub>La energía de una molécula</Sub>
              <P>
                Casi toda la química se reduce a una pregunta: ¿cuál es la
                energía más baja que puede tener una molécula para una cierta
                disposición de sus núcleos? Si acercamos demasiado los núcleos,
                sus cargas positivas se repelen y la energía sube. Si los
                alejamos demasiado, la molécula deja de existir. En el medio hay
                una distancia en la que la energía es mínima: la{' '}
                <B>distancia de equilibrio</B> <M>{'R_e'}</M>. La diferencia
                entre la energía de los átomos separados y ese mínimo es la{' '}
                <B>energía de disociación</B> <M>{'D_e'}</M>, es decir, lo que
                cuesta romper la molécula.
              </P>
              <P>
                Para cada distancia, esa energía mínima es el autovalor más
                chico <M>{'E_0'}</M> del hamiltoniano electrónico{' '}
                <M>{'\\hat H'}</M> de la molécula. El problema es que la
                dimensión de <M>{'\\hat H'}</M> crece exponencialmente con el
                tamaño del sistema, y por eso los métodos clásicos exactos (como
                FCI) dejan de ser viables muy rápido. Los métodos clásicos
                aproximados (como CCSD) funcionan muy bien cerca del equilibrio,
                pero acumulan cada vez más error a medida que se estiran los
                enlaces.
              </P>

              <Sub>De la molécula a los qubits</Sub>
              <P>El camino tiene dos partes:</P>
              <Steps>
                <li>
                  <B>Obtener el hamiltoniano:</B> como <M>{'\\hat H'}</M> es
                  distinto para cada distancia internuclear, hay que construirlo
                  una vez por punto de la curva. Con Hartree-Fock se definen los
                  orbitales moleculares (espín-orbitales) y se escribe{' '}
                  <M>{'\\hat H'}</M> con operadores de creación y aniquilación
                  fermiónicos:
                  <MBlock>
                    {
                      '\\hat H = \\sum_{pq} h_{pq}\\, a_p^\\dagger a_q + \\frac{1}{2} \\sum_{pqrs} h_{pqrs}\\, a_p^\\dagger a_q^\\dagger a_r a_s.'
                    }
                  </MBlock>
                  Luego una transformación como la de Jordan-Wigner reescribe
                  esos operadores con matrices de Pauli, y el hamiltoniano queda
                  como una suma de cadenas de Pauli que se pueden medir en un
                  circuito cuántico:
                  <MBlock>
                    {
                      '\\hat H = \\sum_k c_k P_k, \\qquad P_k \\in \\{I, X, Y, Z\\}^{\\otimes n}.'
                    }
                  </MBlock>
                </li>
                <li>
                  <B>Encontrar su estado fundamental:</B> el{' '}
                  <em>Variational Quantum Eigensolver</em> (VQE) propone un
                  estado de prueba{' '}
                  <M>{'|\\psi(\\boldsymbol\\theta)\\rangle'}</M> preparado por
                  un circuito parametrizado (el <em>ansatz</em>), mide su
                  energía en la computadora cuántica y usa un optimizador
                  clásico para ajustar los parámetros{' '}
                  <M>{'\\boldsymbol\\theta'}</M>. El principio variacional
                  garantiza que
                  <MBlock>
                    {
                      'E(\\boldsymbol\\theta) = \\left\\langle \\psi(\\boldsymbol\\theta) \\,\\middle|\\, \\hat H \\,\\middle|\\, \\psi(\\boldsymbol\\theta) \\right\\rangle \\geq E_0,'
                    }
                  </MBlock>
                  así que minimizar <M>{'E(\\boldsymbol\\theta)'}</M> nos acerca
                  a <M>{'E_0'}</M> desde arriba.
                </li>
              </Steps>

              <Sub>El ruido</Sub>
              <P>
                En 2017, IBM calculó con VQE las curvas de energía de{' '}
                <M>{'\\mathrm{H_2}'}</M>, <M>{'\\mathrm{LiH}'}</M> y{' '}
                <M>{'\\mathrm{BeH_2}'}</M> en un procesador de 6 qubits (Kandala
                et al., <em>Nature</em> 549, 242). El gran obstáculo era, y
                sigue siendo, el ruido. Cada compuerta tiene una probabilidad de
                fallar, y un circuito con muchas compuertas termina devolviendo
                basura. Por eso, en este desafío no alcanza con llegar al número
                correcto: importa <B>cómo</B> se llega, con cuántas compuertas y
                con cuántas mediciones.
              </P>
            </Section>

            <Section id="desafio">
              <P>
                Calcular con VQE la curva de energía de una cadena de cuatro
                hidrógenos (<M>{'\\mathrm{H_4}'}</M>) mientras se separan sus
                átomos, y ganarle a CCSD en la zona donde ese método clásico
                falla. La cadena es recta, con los átomos separados por la misma
                distancia <M>{'d'}</M>, en la base STO-3G.
              </P>
              <Steps>
                <li>
                  <B>Curva de energía:</B> calculen <M>{'E(d)'}</M> con al menos
                  10 distancias entre <M>{`0{,}6\\ ${ANGSTROM}`}</M> y{' '}
                  <M>{`3{,}0\\ ${ANGSTROM}`}</M>, cada energía con su barra de
                  error <M>{'\\pm\\sigma'}</M> (la incertidumbre estadística de
                  la estimación), y compárenla con CCSD y con la energía exacta
                  (FCI).
                </li>
                <li>
                  <B>Equilibrio y disociación:</B> obtengan la distancia de
                  equilibrio <M>{'R_e'}</M> y la energía de disociación,
                  definida como
                  <MBlock>{`D_e = E\\big(3{,}0\\ ${ANGSTROM}\\big) - E(R_e),`}</MBlock>
                  ya que a <M>{`3{,}0\\ ${ANGSTROM}`}</M> los átomos se
                  consideran separados.
                </li>
                <li>
                  <B>Ganarle a CCSD:</B> desde <M>{`1{,}8\\ ${ANGSTROM}`}</M> en
                  adelante, logren un error menor que el suyo contando la barra
                  de error:
                  <MBlock>
                    {`\\left|E_{\\mathrm{VQE}} - E_{\\mathrm{FCI}}\\right| + \\sigma < \\left|E_{\\mathrm{CCSD}} - E_{\\mathrm{FCI}}\\right| \\quad \\text{para } d \\geq 1{,}8\\ ${ANGSTROM}.`}
                  </MBlock>
                </li>
                <li>
                  <B>Meta máxima:</B> lleguen a precisión química en esa zona:
                  <MBlock>
                    {
                      '\\left|E_{\\mathrm{VQE}} - E_{\\mathrm{FCI}}\\right| < 1{,}6\\ \\text{mHa}.'
                    }
                  </MBlock>
                </li>
              </Steps>
            </Section>

            <Section id="reglas">
              <Bullets>
                <li>
                  El algoritmo del desafío central es <B>VQE</B>. SQD no vale
                  para el desafío central, porque con tan pocos qubits hasta
                  muestras al azar dan la respuesta exacta (pueden usarlo como
                  extra, ver más abajo).
                </li>
                <li>
                  Las energías reportadas tienen que salir de medir circuitos
                  con EstimatorV2 o SamplerV2 de qiskit_aer, no de leer el
                  estado del simulador.
                </li>
                <li>
                  Pueden buscar los parámetros como quieran, incluso sin ruido.
                </li>
                <li>
                  Los métodos clásicos no sirven como resultados: solo para
                  comparar y para elegir puntos de partida.
                </li>
                <li>
                  En la zona estirada, argumenten por qué su resultado es
                  confiable antes de compararlo con FCI.
                </li>
              </Bullets>
            </Section>

            <Section id="entrega">
              <P>
                Un notebook de Google Colab, guardado en una carpeta de Google
                Drive compartida con el jurado, que corra de punta a punta en
                Colab (instalando sus propias dependencias) y reproduzca la
                curva, <M>{'R_e'}</M> y <M>{'D_e'}</M>. Tiene que incluir:
              </P>
              <Bullets>
                <li>
                  una tabla con, para cada punto: la energía, su error, los{' '}
                  <em>shots</em> usados y la cantidad de compuertas cz;
                </li>
                <li>
                  una explicación de qué decidieron, por qué, y qué no funcionó.
                </li>
              </Bullets>
            </Section>

            <Section id="extras">
              <P>
                Nada de esto es obligatorio. Son ideas para quienes tengan
                tiempo o quieran agregar algo que diferencie su trabajo, y solo
                se tienen en cuenta si el desafío central está completo.
              </P>
              <Bullets>
                <li>
                  <B>Simulador con ruido:</B> repetir la curva (o parte de ella)
                  con el modelo de ruido de ruido.py, igual para todos:
                  compuertas cz, sx, x y rz, qubits conectados en línea, y una
                  probabilidad de error de 0,1 % por cz y 0,005 % por compuerta
                  de un qubit.
                </li>
                <li>
                  <B>Ruido de hardware real:</B> repetir un punto estirado con
                  el ruido completo de FakeFez.
                </li>
                <li>
                  <B>Mitigación de errores:</B> aplicar técnicas que
                  funcionarían en una computadora real, como{' '}
                  <em>Zero Noise Extrapolation</em> (ZNE) o corrección de
                  errores de <em>readout</em>.
                </li>
                <li>
                  <B>Menos qubits:</B> reducir a 6 qubits o menos usando
                  simetrías y medir cuánto mejora.
                </li>
                <li>
                  <B>Precisión química:</B> lograrla en toda la zona estirada (
                  <M>{`d \\geq 1{,}8\\ ${ANGSTROM}`}</M>).
                </li>
                <li>
                  <B>Comparar ansätze:</B> probar distintos <em>ansätze</em> y
                  comparar precisión, profundidad y costo.
                </li>
                <li>
                  <B>VQE vs. SQD:</B> correr SQD en la zona estirada y
                  compararlo con VQE, o mostrar si las muestras cuánticas le
                  ganan al azar cuando se pone un tope al tamaño del subespacio.
                </li>
                <li>
                  <B>Otra geometría:</B> correr otra forma de{' '}
                  <M>{'\\mathrm{H_4}'}</M> cambiando solo la geometría.
                </li>
              </Bullets>
            </Section>

            <Section id="evaluacion">
              <P>El jurado va a mirar, entre otras cosas:</P>
              <Bullets>
                <li>
                  <B>Precisión y complejidad técnica:</B> error en la zona
                  estirada comparado con CCSD, precisión en <M>{'R_e'}</M> y{' '}
                  <M>{'D_e'}</M>, y qué tan elaborada es la solución.
                </li>
                <li>
                  <B>Validación:</B> barras de error bien calculadas y qué tan
                  convincente es el argumento de confiabilidad.
                </li>
                <li>
                  <B>Manejo del presupuesto y de los recursos:</B> cantidad de
                  compuertas y reparto de <em>shots</em> (y, si lo hacen, manejo
                  del ruido y mitigación).
                </li>
                <li>
                  <B>Análisis de limitaciones:</B> hasta dónde funciona el
                  método, dónde falla y por qué.
                </li>
                <li>
                  <B>Claridad del notebook:</B> explicaciones, estructura y
                  reproducibilidad.
                </li>
                <li>
                  <B>Creatividad:</B> las decisiones que tomaron, qué probaron y
                  las cosas extra que sumaron.
                </li>
              </Bullets>
              <aside className="border-brand-text-faint bg-brand-panel mt-6 border-l-4 px-5 py-4">
                <B>Importante:</B> la evaluación es integral y queda a criterio
                del jurado. Estos puntos orientan sobre qué se va a mirar, pero
                no son una rúbrica con puntajes ni una lista de requisitos para
                llegar a una nota.
              </aside>
            </Section>

            <Section id="recursos">
              <Bullets>
                <li>
                  A. Kandala et al., «Hardware-efficient variational quantum
                  eigensolver for small molecules and quantum magnets»,{' '}
                  <Ext href="https://doi.org/10.1038/nature23879">
                    <em>Nature</em> 549, 242 (2017)
                  </Ext>
                  .
                </li>
                <li>
                  K. Temme, S. Bravyi y J. Gambetta, «Error mitigation for
                  short-depth quantum circuits»,{' '}
                  <Ext href="https://doi.org/10.1103/PhysRevLett.119.180509">
                    <em>Phys. Rev. Lett.</em> 119, 180509 (2017)
                  </Ext>
                  .
                </li>
                <li>
                  <Ext href="https://pyscf.org">PySCF</Ext>,{' '}
                  <Ext href="https://github.com/Qiskit/qiskit-aer">
                    Qiskit Aer
                  </Ext>{' '}
                  y{' '}
                  <Ext href="https://github.com/Qiskit/qiskit-addon-sqd">
                    qiskit-addon-sqd
                  </Ext>
                  .
                </li>
                <li>
                  <Ext href="https://pennylane.ai/qml/demonstrations">
                    Demos de PennyLane
                  </Ext>
                  : muy buenas explicaciones de VQE y química cuántica (usan
                  PennyLane en lugar de Qiskit, pero los algoritmos son los
                  mismos).
                </li>
                <li>
                  <Ext href="https://quantum.cloud.ibm.com/learning">
                    IBM Quantum Learning
                  </Ext>
                  : cursos y tutoriales sobre VQE, química cuántica y mitigación
                  de errores.
                </li>
              </Bullets>
            </Section>
          </article>
        </div>
      </main>
      <Footer />
    </>
  )
}
