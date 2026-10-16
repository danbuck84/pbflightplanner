import React, { useState } from 'react';
import { BookOpen, Compass, Gauge, Layers, Image as ImageIcon, Eye } from 'lucide-react';

const HPA_POL_TABLE = Array.from({ length: 32 }, (_, i) => {
  const hpa = 999 + i;
  const pol = (hpa * 0.02953).toFixed(2);
  return { hpa, pol };
});

const MACH_ISA_TABLE = [
  { fromFt: '0', toFt: '0', meters: '0', tempC: '15°C', soundKt: 662, soundKmh: 1226 },
  { fromFt: '5.000', toFt: '14.999', meters: '1.500', tempC: '5°C', soundKt: 650, soundKmh: 1200 },
  { fromFt: '15.000', toFt: '29.999', meters: '4.500', tempC: '-15°C', soundKt: 627, soundKmh: 1160 },
  { fromFt: '30.000', toFt: '39.999', meters: '9.000', tempC: '-34°C', soundKt: 602, soundKmh: 1115 },
  { fromFt: '40.000', toFt: 'Acima', meters: '12.000', tempC: '-55°C', soundKt: 574, soundKmh: 1063 },
];

const TL_MATRIX = [
  { range: '942.2 a 959.4 hPa', ta2: 'FL45', ta3: 'FL55', ta4: 'FL65', ta5: 'FL75', ta6: 'FL85', ta7: 'FL95' },
  { range: '959.5 a 977.1 hPa', ta2: 'FL40', ta3: 'FL50', ta4: 'FL60', ta5: 'FL70', ta6: 'FL80', ta7: 'FL90' },
  { range: '977.2 a 995.0 hPa', ta2: 'FL35', ta3: 'FL45', ta4: 'FL55', ta5: 'FL65', ta6: 'FL75', ta7: 'FL85' },
  { range: '995.1 a 1013.2 hPa', ta2: 'FL30', ta3: 'FL40', ta4: 'FL50', ta5: 'FL60', ta6: 'FL70', ta7: 'FL80' },
  { range: '1013.3 a 1031.6 hPa', ta2: 'FL25', ta3: 'FL35', ta4: 'FL45', ta5: 'FL55', ta6: 'FL65', ta7: 'FL75' },
  { range: '1031.7 a 1050.3 hPa', ta2: 'FL20', ta3: 'FL30', ta4: 'FL40', ta5: 'FL50', ta6: 'FL60', ta7: 'FL70' },
];

const REFERENCE_DIAGRAMS = [
  { title: 'Mínimos VFR & Espaço Aéreo', file: '/reference-images/image28.png' },
  { title: 'Mínimos Meteorológicos VFR', file: '/reference-images/image21.png' },
  { title: 'Regras de Níveis de Voo (Par / Ímpar)', file: '/reference-images/image29.png' },
  { title: 'Tabela de Níveis VFR / IFR', file: '/reference-images/image40.png' },
  { title: 'Rosa dos Ventos & Rumos', file: '/reference-images/image23.png' },
  { title: 'ACN / PCN - B737-800', file: '/reference-images/image26.png' },
  { title: 'Cálculo de Pista em Uso & Declinação', file: '/reference-images/image7.png' },
  { title: 'Distâncias Declaradas da Pista (TORA/TODA/ASDA/LDA)', file: '/reference-images/image33.png' },
  { title: 'Classificação PCN de Pavimentos', file: '/reference-images/image24.png' },
  { title: 'Tabela PCN - Subleito e Resistência', file: '/reference-images/image30.png' },
  { title: 'Decodificação de METAR', file: '/reference-images/image42.png' },
  { title: 'Plano de Voo VATSIM / vPilot', file: '/reference-images/image34.png' },
  { title: 'Especificações Cessna 172 (Parte 1)', file: '/reference-images/image41.png' },
  { title: 'Especificações Cessna 172 (Parte 2)', file: '/reference-images/image36.png' },
];

export const ReferenceSummaryTab: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<{ title: string; file: string } | null>(null);

  return (
    <div className="space-y-6">
      {/* Top Grid: Semicircular Rules, Transition Level Table, and Magnetic Declination Example */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 1. Tabela de Nível de Transição (TB_TL) */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Layers className="h-5 w-5 text-sky-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Tabela Oficial de Nível de Transição — TL (ICA 100-12 / DECEA)
            </h3>
          </div>
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
            Cruzamento entre o QNH do aeródromo e a Altitude de Transição (TA) constante na carta IAC/SID. Acima de 7.000 ft, o TL é definido pelo ATC.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 font-mono text-[11px] font-semibold">
                  <th className="py-2 px-2 text-left">Faixa QNH (hPa)</th>
                  <th className="py-2 px-2">2000 ft</th>
                  <th className="py-2 px-2">3000 ft</th>
                  <th className="py-2 px-2">4000 ft</th>
                  <th className="py-2 px-2">5000 ft</th>
                  <th className="py-2 px-2">6000 ft</th>
                  <th className="py-2 px-2">7000 ft</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {TL_MATRIX.map((r) => (
                  <tr key={r.range} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2 px-2 text-left font-sans text-xs font-medium">{r.range}</td>
                    <td className="py-2 px-2 text-sky-600 dark:text-sky-400 font-bold">{r.ta2}</td>
                    <td className="py-2 px-2 text-sky-600 dark:text-sky-400 font-bold">{r.ta3}</td>
                    <td className="py-2 px-2 text-sky-600 dark:text-sky-400 font-bold">{r.ta4}</td>
                    <td className="py-2 px-2 text-sky-600 dark:text-sky-400 font-bold">{r.ta5}</td>
                    <td className="py-2 px-2 text-sky-600 dark:text-sky-400 font-bold">{r.ta6}</td>
                    <td className="py-2 px-2 text-sky-600 dark:text-sky-400 font-bold">{r.ta7}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2. Velocidade do Som & Número Mach (TB_Mach) */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Gauge className="h-5 w-5 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Velocidade do Som por Altitude & Fluxo Mach (TB_Mach)
            </h3>
          </div>
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
            A velocidade do som no ar depende exclusivamente da temperatura absoluta. Ao subir, a temperatura diminui e a velocidade do som cai:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-[11px] font-semibold">
                  <th className="py-2 px-2">Altitude De (ft)</th>
                  <th className="py-2 px-2">Até (ft)</th>
                  <th className="py-2 px-2">Metros</th>
                  <th className="py-2 px-2">Temp. ISA</th>
                  <th className="py-2 px-2">Vel. Som (kts)</th>
                  <th className="py-2 px-2">Vel. Som (km/h)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {MACH_ISA_TABLE.map((row, idx) => (
                  <tr key={idx}>
                    <td className="py-1.5 px-2">{row.fromFt}</td>
                    <td className="py-1.5 px-2">{row.toFt}</td>
                    <td className="py-1.5 px-2">{row.meters}</td>
                    <td className="py-1.5 px-2">{row.tempC}</td>
                    <td className="py-1.5 px-2 font-bold text-amber-600 dark:text-amber-400">
                      {row.soundKt} kts
                    </td>
                    <td className="py-1.5 px-2">{row.soundKmh} km/h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 text-[11px]">
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-2">
              <div className="font-bold text-slate-700 dark:text-slate-200">Subsônico</div>
              <div className="text-slate-500">&lt; 0.75 Mach</div>
            </div>
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-2">
              <div className="font-bold text-slate-700 dark:text-slate-200">Transônico</div>
              <div className="text-slate-500">0.75 a 1.20 Mach</div>
            </div>
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-2">
              <div className="font-bold text-slate-700 dark:text-slate-200">Supersônico</div>
              <div className="text-slate-500">1.20 a 5.00 Mach</div>
            </div>
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-2">
              <div className="font-bold text-slate-700 dark:text-slate-200">Hipersônico</div>
              <div className="text-slate-500">&gt; 5.00 Mach</div>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Grid: Practical Example of Runway in Use (SBFL) & hPa/inHg Conversion Table */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Passo a passo Pista em Uso e Declinação Magnética (Resumo!B34:E44) */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Compass className="h-5 w-5 text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Exemplo Prático: Cálculo de Declinação Magnética e Pista em Uso (SBFL)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold uppercase text-slate-500">
                  <th className="py-2 px-2">Informação</th>
                  <th className="py-2 px-2">Valor</th>
                  <th className="py-2 px-2">Origem</th>
                  <th className="py-2 px-2">Observação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <tr>
                  <td className="py-2 px-2 font-semibold">Aeródromo</td>
                  <td className="py-2 px-2 font-mono font-bold text-sky-500">SBFL</td>
                  <td className="py-2 px-2">Plano de Voo</td>
                  <td className="py-2 px-2">Florianópolis</td>
                </tr>
                <tr>
                  <td className="py-2 px-2 font-semibold">Vento Verdadeiro</td>
                  <td className="py-2 px-2 font-mono">02010KT</td>
                  <td className="py-2 px-2">METAR</td>
                  <td className="py-2 px-2">Norte Verdadeiro (020°)</td>
                </tr>
                <tr>
                  <td className="py-2 px-2 font-semibold">Declinação Mag. Carta</td>
                  <td className="py-2 px-2 font-mono">19° W (2015)</td>
                  <td className="py-2 px-2">PDC, ADC, WAC</td>
                  <td className="py-2 px-2">Ano base da carta</td>
                </tr>
                <tr>
                  <td className="py-2 px-2 font-semibold">Variação Anual</td>
                  <td className="py-2 px-2 font-mono">8' 06'' W</td>
                  <td className="py-2 px-2">Carta WAC</td>
                  <td className="py-2 px-2">WAC 3313</td>
                </tr>
                <tr>
                  <td className="py-2 px-2 font-semibold">Variação Acumulada</td>
                  <td className="py-2 px-2 font-mono">48' 36'' (0.8°)</td>
                  <td className="py-2 px-2">8' 06'' × 6 anos</td>
                  <td className="py-2 px-2">Atualizada</td>
                </tr>
                <tr>
                  <td className="py-2 px-2 font-semibold">Declinação Atualizada</td>
                  <td className="py-2 px-2 font-mono">19.8° → 20° W</td>
                  <td className="py-2 px-2">Decl. + Variação</td>
                  <td className="py-2 px-2">W = Soma / E = Subtrai</td>
                </tr>
                <tr>
                  <td className="py-2 px-2 font-semibold">Vento Magnético</td>
                  <td className="py-2 px-2 font-mono font-bold">039°</td>
                  <td className="py-2 px-2">Vento METAR + Decl.</td>
                  <td className="py-2 px-2">20° + 19° = 39°</td>
                </tr>
                <tr>
                  <td className="py-2 px-2 font-semibold">Cabeceiras</td>
                  <td className="py-2 px-2 font-mono">142° / 322° (14/32)</td>
                  <td className="py-2 px-2">ADC - RWY 14/32</td>
                  <td className="py-2 px-2">Pista em Uso = <strong>32</strong> (menor dif. angular)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabela de Conversão hPa <-> inHg (HPA_POL) */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-purple-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Tabela de Equivalência Rápida QNH: hPa ↔ inHg (HPA_POL)
            </h3>
          </div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
            {HPA_POL_TABLE.map((item) => (
              <div
                key={item.hpa}
                className={`rounded-lg border p-1.5 text-center font-mono text-xs ${
                  item.hpa === 1013
                    ? 'border-sky-500 bg-sky-500/15 font-bold text-sky-600 dark:text-sky-300'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40'
                }`}
              >
                <div className="text-[11px] font-bold">{item.hpa}</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">{item.pol}"</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Visual Reference Gallery extracted from the original Excel workbook */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-sky-500" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Pranchas Visuais de Consulta Rápida (Aba Resumo Original)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Clique em qualquer prancha abaixo para ampliar em tela cheia (Mínimos VFR, Níveis, Rosa dos Ventos, PCN, METAR, vPilot e C172).
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {REFERENCE_DIAGRAMS.map((diag) => (
            <button
              key={diag.file}
              type="button"
              onClick={() => setSelectedImage(diag)}
              className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-left transition hover:border-sky-500 hover:shadow-md"
            >
              <div className="relative flex h-40 w-full items-center justify-center overflow-hidden bg-slate-900/90 p-2">
                <img
                  src={diag.file}
                  alt={diag.title}
                  className="max-h-full max-w-full object-contain transition duration-200 group-hover:scale-105"
                />
                <div className="absolute right-2 bottom-2 rounded-lg bg-slate-950/75 p-1.5 text-white opacity-0 transition group-hover:opacity-100">
                  <Eye className="h-4 w-4" />
                </div>
              </div>
              <div className="p-3">
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {diag.title}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox Modal for Reference Diagram */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="max-h-[90vh] max-w-5xl overflow-auto rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-bold text-white">{selectedImage.title}</h4>
              <button
                type="button"
                onClick={() => setSelectedImage(null)}
                className="rounded-lg bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700"
              >
                Fechar (ESC)
              </button>
            </div>
            <img
              src={selectedImage.file}
              alt={selectedImage.title}
              className="mx-auto max-h-[78vh] w-auto rounded-lg bg-white p-2"
            />
          </div>
        </div>
      )}
    </div>
  );
};
