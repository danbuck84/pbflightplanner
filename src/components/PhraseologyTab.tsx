import React from 'react';
import { Radio, ShieldCheck, Info } from 'lucide-react';
import type { Aerodrome, FlightPlan } from '../types/aviation';

interface PhraseologyTabProps {
  plan: FlightPlan;
  onUpdatePlan: (updater: (prev: FlightPlan) => FlightPlan) => void;
  originAerodrome?: Aerodrome;
  destinationAerodrome?: Aerodrome;
  alternateAerodrome?: Aerodrome;
  originActiveRunway: string;
  destinationActiveRunway: string;
  predominantAltitudeCode: string;
  totalEnduranceFormatted: string;
}

const ATC_AGENCIES = [
  {
    name: 'Tráfego',
    code: 'TRÁFEGO',
    responsibility: 'Somente aprova Plano de Voo (Autorização de Tráfego / Clearance Delivery).',
  },
  {
    name: 'Controle Solo',
    code: 'SOLO',
    responsibility:
      'Pushback, acionamento e táxi até o ponto de espera (para quem decola) e inicia quando livra a pista após o pouso.',
  },
  {
    name: 'Torre de Controle',
    code: 'TORRE',
    responsibility:
      'Autorizar ingresso e decolagem na pista em uso, e para pouso autorizar a entrada no circuito de tráfego e o pouso.',
  },
  {
    name: 'Controle de Aproximação',
    code: 'CONTROLE (APP)',
    responsibility:
      'Organizar o tráfego que chega e sai em uma Terminal (TMA — aeródromos próximos à região de origem/destino).',
  },
  {
    name: 'Centro de Controle de Área',
    code: 'CENTRO (ACC)',
    responsibility:
      'Responsável pelas aerovias e espaço aéreo superior/inferior em rota. Caso não haja órgão local ativo, assume a coordenação (exceto solo).',
  },
];

export const PhraseologyTab: React.FC<PhraseologyTabProps> = ({
  plan,
  onUpdatePlan,
  originAerodrome,
  destinationAerodrome,
  OriginActiveRunwayFallback = 'XX',
  originActiveRunway,
  destinationActiveRunway,
  predominantAltitudeCode,
  totalEnduranceFormatted,
}: PhraseologyTabProps & { OriginActiveRunwayFallback?: string }) => {
  const callsign = plan.callsign.trim().toUpperCase() || 'GLD1537';
  const shortCallsign = callsign.length > 3 ? callsign.slice(-3) : callsign;
  const originIcao = plan.origin.icao || 'SBMT';
  const destIcao = plan.destination.icao || 'SDAM';
  const altIcao = plan.alternate.icao || 'SDTF';
  const originName = originAerodrome?.city || originAerodrome?.name || originIcao;
  const destName = destinationAerodrome?.city || destinationAerodrome?.name || destIcao;

  const depRwy = originActiveRunway || originAerodrome?.runway2 || OriginActiveRunwayFallback;
  const arrRwy = destinationActiveRunway || destinationAerodrome?.runway2 || 'XX';
  const qnhOrigin = plan.origin.qnhHpa || '1013';
  const qnhDest = plan.destination.qnhHpa || '1012';
  const pob = String(plan.crewCount || 1).padStart(2, '0');
  const altCode = predominantAltitudeCode || (plan.flightRule === 'VFR' ? 'A045' : 'FL060');
  const altSpoken = altCode.replace(/^(FL|A|F)/, '');

  // Format endurance hh:mm:ss into "01h12"
  const enduranceParts = totalEnduranceFormatted.split(':');
  const enduranceSpoken =
    enduranceParts.length >= 2
      ? `${enduranceParts[0]}h${enduranceParts[1]}min`
      : totalEnduranceFormatted;

  const parking = plan.parkingStand || 'Pátio Geral';
  const freqGroundDep = plan.departureFreqGround || '121.60';
  const freqTowerDep = plan.departureFreqTower || '118.70';
  const freqAppDep = plan.departureFreqApp || '129.75';
  const centerName = plan.enrouteCenterName || 'Brasília';
  const freqCenter = plan.enrouteFreqCenter || '123.30';
  const freqAppArr = plan.arrivalFreqApp || '119.30';
  const freqTowerArr = plan.arrivalFreqTower || '118.05';
  const freqGroundArr = plan.arrivalFreqGround || '121.90';
  const sidProfile = plan.sidOrExitProfile || (plan.flightRule === 'VFR' ? 'Portão Visual / REA' : 'SID');
  const starProfile = plan.starOrApproachProfile || (plan.flightRule === 'VFR' ? 'Circuito Visual' : 'STAR / ILS');
  const squawk = plan.transponderCode || '2000';

  const PhraseStep = ({
    stepNumber,
    title,
    dialogues,
  }: {
    stepNumber: number;
    title: string;
    dialogues: Array<{ speaker: 'PILOTO' | 'ATC'; text: string }>;
  }) => (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-500/15 font-mono text-xs font-bold text-sky-600 dark:text-sky-400">
          {stepNumber}
        </span>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      </div>
      <div className="space-y-2.5">
        {dialogues.map((d, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 rounded-lg p-2.5 text-xs leading-relaxed ${
              d.speaker === 'PILOTO'
                ? 'bg-sky-50/80 dark:bg-sky-950/35 border border-sky-200/60 dark:border-sky-800/40 text-slate-800 dark:text-slate-100'
                : 'bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50 text-slate-700 dark:text-slate-300'
            }`}
          >
            <span
              className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase ${
                d.speaker === 'PILOTO'
                  ? 'bg-sky-600 text-white'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              {d.speaker}
            </span>
            <p className="font-medium">{d.text}</p>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Top configuration bar for frequencies and positions used in the dynamic script */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Radio className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Fraseologia Dinâmica Integrada ao Plano de Voo
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Preenchida automaticamente com Callsign (<span className="font-mono font-semibold text-sky-500">{callsign}</span>), Pistas (<span className="font-mono font-semibold">{depRwy}</span> → <span className="font-mono font-semibold">{arrRwy}</span>), QNH, POB e Autonomia. Ajuste frequências abaixo se desejar:
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Posição / Gate ({originIcao})
            </label>
            <input
              type="text"
              value={plan.parkingStand || ''}
              onChange={(e) => onUpdatePlan((p) => ({ ...p, parkingStand: e.target.value }))}
              placeholder="Pátio / Gate"
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1.5 text-xs font-medium"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Transponder (Squawk)
            </label>
            <input
              type="text"
              value={plan.transponderCode || ''}
              onChange={(e) => onUpdatePlan((p) => ({ ...p, transponderCode: e.target.value }))}
              placeholder="2000"
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1.5 font-mono text-xs font-semibold"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Freq. Solo / Torre ({originIcao})
            </label>
            <div className="mt-1 flex gap-1">
              <input
                type="text"
                value={plan.departureFreqGround || ''}
                onChange={(e) => onUpdatePlan((p) => ({ ...p, departureFreqGround: e.target.value }))}
                placeholder="Solo 121.6"
                className="w-1/2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-2 py-1.5 font-mono text-xs"
              />
              <input
                type="text"
                value={plan.departureFreqTower || ''}
                onChange={(e) => onUpdatePlan((p) => ({ ...p, departureFreqTower: e.target.value }))}
                placeholder="TWR 118.7"
                className="w-1/2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-2 py-1.5 font-mono text-xs"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Saída / SID & Freq. APP
            </label>
            <div className="mt-1 flex gap-1">
              <input
                type="text"
                value={plan.sidOrExitProfile || ''}
                onChange={(e) => onUpdatePlan((p) => ({ ...p, sidOrExitProfile: e.target.value }))}
                placeholder="Perfil/SID"
                className="w-1/2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-2 py-1.5 text-xs"
              />
              <input
                type="text"
                value={plan.departureFreqApp || ''}
                onChange={(e) => onUpdatePlan((p) => ({ ...p, departureFreqApp: e.target.value }))}
                placeholder="129.75"
                className="w-1/2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-2 py-1.5 font-mono text-xs"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Centro (ACC) & Freq.
            </label>
            <div className="mt-1 flex gap-1">
              <input
                type="text"
                value={plan.enrouteCenterName || ''}
                onChange={(e) => onUpdatePlan((p) => ({ ...p, enrouteCenterName: e.target.value }))}
                placeholder="Brasília"
                className="w-1/2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-2 py-1.5 text-xs"
              />
              <input
                type="text"
                value={plan.enrouteFreqCenter || ''}
                onChange={(e) => onUpdatePlan((p) => ({ ...p, enrouteFreqCenter: e.target.value }))}
                placeholder="123.30"
                className="w-1/2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-2 py-1.5 font-mono text-xs"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Chegada / TWR ({destIcao})
            </label>
            <div className="mt-1 flex gap-1">
              <input
                type="text"
                value={plan.starOrApproachProfile || ''}
                onChange={(e) =>
                  onUpdatePlan((p) => ({ ...p, starOrApproachProfile: e.target.value }))
                }
                placeholder="STAR/Visual"
                className="w-1/2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-2 py-1.5 text-xs"
              />
              <input
                type="text"
                value={plan.arrivalFreqTower || ''}
                onChange={(e) => onUpdatePlan((p) => ({ ...p, arrivalFreqTower: e.target.value }))}
                placeholder="118.05"
                className="w-1/2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-2 py-1.5 font-mono text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main 8 Phraseology Steps + ATC Responsibilities Table */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <PhraseStep
            stepNumber={1}
            title="Fraseologia com Tráfego (Autorização de Tráfego - Plano de Voo)"
            dialogues={[
              {
                speaker: 'PILOTO',
                text: `Tráfego ${originName}, ${callsign}.`,
              },
              {
                speaker: 'PILOTO',
                text: `${callsign}, solicito autorização para ${destIcao} (${destName}), na regra de voo ${plan.flightRule}, ${altCode}, ciente das informações do METAR.`,
              },
              {
                speaker: 'PILOTO',
                text: `${shortCallsign}, ciente / pronto para cópia.`,
              },
              {
                speaker: 'ATC',
                text: `${callsign}, autorizado ${destIcao}, ${plan.flightRule}, Nível/Altitude ${altSpoken} (sem falar o F ou A), rota conforme plano de voo, pista em uso ${depRwy}, aciona transponder ${squawk}, e ajuste de altímetro ${qnhOrigin}.`,
              },
              {
                speaker: 'PILOTO',
                text: `Autorizado ${destIcao}, ${plan.flightRule}, ${altSpoken}, rota conforme plano de voo, pista em uso ${depRwy}, transponder ${squawk}, ajuste ${qnhOrigin}. Chamará o Solo ${originName} na frequência ${freqGroundDep}, ${callsign}.`,
              },
            ]}
          />

          <PhraseStep
            stepNumber={2}
            title="Fraseologia com Solo (Autorização de Pushback, Acionamento e Táxi)"
            dialogues={[
              {
                speaker: 'PILOTO',
                text: `Solo ${originName}, ${callsign}, pronto para pushback e acionamento no ${parking} (conforme carta PDC).`,
              },
              {
                speaker: 'ATC',
                text: `${callsign}, autorizado pushback e acionamento, chamará pronto para o táxi.`,
              },
              {
                speaker: 'PILOTO',
                text: `Solo ${originName}, ${callsign}, pronto para o táxi, com ${pob} pessoa(s) a bordo, ${enduranceSpoken} de autonomia, alternando ${altIcao}.`,
              },
              {
                speaker: 'ATC',
                text: `${callsign}, autorizado táxi até o ponto de espera da pista ${depRwy}, ajuste ${qnhOrigin}, aproximando do ponto de espera chamará a Torre ${originName} na frequência ${freqTowerDep}.`,
              },
            ]}
          />

          <PhraseStep
            stepNumber={3}
            title="Fraseologia com a Torre (Ingresso na Pista em Uso e Decolagem)"
            dialogues={[
              {
                speaker: 'PILOTO',
                text: `Torre ${originName}, ${callsign}, no ponto de espera da pista ${depRwy}, pronto para decolagem.`,
              },
              {
                speaker: 'ATC',
                text: `${callsign}, autorizado alinhar e manter na pista ${depRwy}, aguarde autorização de decolagem.`,
              },
              {
                speaker: 'PILOTO',
                text: `Alinha e mantém na pista ${depRwy}, ${callsign}.`,
              },
              {
                speaker: 'ATC',
                text: `${callsign}, vento calmo/operacional, livre decolagem na pista ${depRwy}, após a decolagem chamará Controle ${originName} em ${freqAppDep}.`,
              },
            ]}
          />

          <PhraseStep
            stepNumber={4}
            title="Fraseologia com Controle (Após Decolagem no Procedimento de Saída)"
            dialogues={[
              {
                speaker: 'PILOTO',
                text: `Controle ${originName}, ${callsign}, decolado da pista ${depRwy}, perfil ${sidProfile}, passando ____ pés para ${altCode}. Na sua escuta.`,
              },
              {
                speaker: 'ATC',
                text: `${callsign}, contato radar, suba e mantenha ${altCode} no perfil ${sidProfile} sob vigilância radar.`,
              },
              {
                speaker: 'PILOTO',
                text: `Sobe e mantém ${altCode} no perfil ${sidProfile}. Chamará o Centro ${centerName} na frequência ${freqCenter}, ${callsign}.`,
              },
            ]}
          />

          <PhraseStep
            stepNumber={5}
            title="Fraseologia com Centro (Comunicação em Rota)"
            dialogues={[
              {
                speaker: 'PILOTO',
                text: `Centro ${centerName}, ${callsign}, mantendo ${altCode} na sua escuta.`,
              },
              {
                speaker: 'ATC',
                text: `${callsign}, mantenha ${altCode} sob vigilância radar.`,
              },
              {
                speaker: 'PILOTO',
                text: `Mantém ${altCode}, e chamará o Controle ${destName} na frequência ${freqAppArr}, ${callsign}.`,
              },
            ]}
          />

          <PhraseStep
            stepNumber={6}
            title="Fraseologia com Controle (Procedimento de Aproximação para Pouso)"
            dialogues={[
              {
                speaker: 'PILOTO',
                text: `Controle ${destName}, ${callsign}, na sua escuta mantendo ${altCode}, ciente da informação de ${destIcao} (QNH ${qnhDest}).`,
              },
              {
                speaker: 'ATC',
                text: `${callsign}, desça via ${starProfile} sob vigilância radar para a pista ${arrRwy}, ajuste ${qnhDest}, reporte estabilizado.`,
              },
              {
                speaker: 'PILOTO',
                text: `${callsign}, estabilizado na aproximação da pista ${arrRwy}.`,
              },
              {
                speaker: 'ATC',
                text: `${callsign}, trem de pouso checado, chame a Torre ${destName} em ${freqTowerArr}.`,
              },
            ]}
          />

          <PhraseStep
            stepNumber={7}
            title="Fraseologia com a Torre (Procedimento de Pouso)"
            dialogues={[
              {
                speaker: 'PILOTO',
                text: `Torre ${destName}, ${callsign} na final da pista ${arrRwy}, trem baixado e travado, com visual da pista.`,
              },
              {
                speaker: 'ATC',
                text: `${callsign}, pouso autorizado na pista ${arrRwy}.`,
              },
              {
                speaker: 'PILOTO',
                text: `Pouso autorizado na pista ${arrRwy}, chamará o Solo ${destName} na frequência ${freqGroundArr} após livrar, ${callsign}.`,
              },
            ]}
          />

          <PhraseStep
            stepNumber={8}
            title="Fraseologia com Solo (Procedimento de Táxi e Corte dos Motores)"
            dialogues={[
              {
                speaker: 'PILOTO',
                text: `Solo ${destName}, ${callsign}, pista ${arrRwy} livre.`,
              },
              {
                speaker: 'ATC',
                text: `${callsign}, prossiga o táxi até o pátio geral / gate na sua escuta até o corte. Bom descanso!`,
              },
              {
                speaker: 'PILOTO',
                text: `Segue táxi até o pátio na sua escuta até o corte, obrigado pelo controle, ${callsign}.`,
              },
            ]}
          />
        </div>

        {/* Right Column: ATC Agencies Reference Table */}
        <div className="space-y-4">
          <div className="sticky top-20 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Órgãos ATC & Responsabilidades
              </h3>
            </div>
            <div className="space-y-3">
              {ATC_AGENCIES.map((agency) => (
                <div
                  key={agency.code}
                  className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {agency.name}
                    </span>
                    <span className="rounded bg-sky-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-sky-600 dark:text-sky-400">
                      {agency.code}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    {agency.responsibility}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-800 dark:text-amber-300">
              <div className="flex items-center gap-1.5 font-bold">
                <Info className="h-4 w-4 shrink-0" />
                <span>Dica de Fonia (Regra Top-Down)</span>
              </div>
              <p className="mt-1 leading-relaxed">
                Nas redes de simulação (VATSIM / IVAO), vale a regra <strong>Top-Down</strong>: se não houver Solo online, chame a Torre; se não houver Torre, chame o Controle (APP); se não houver Controle, chame o Centro (ACC) responsável pela FIR. Sem nenhum órgão ativo, coordene na frequência <strong>UNICOM 122.800</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
