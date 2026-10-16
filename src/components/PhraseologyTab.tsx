import React from 'react';
import { ShieldCheck, Info } from 'lucide-react';
import type { Aerodrome, FlightPlan } from '../types/aviation';

interface PhraseologyTabProps {
  plan: FlightPlan;
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
    responsibility: 'Somente aprova Plano de Voo.',
  },
  {
    name: 'Controle Solo',
    code: 'SOLO',
    responsibility:
      'Pushback, acionamento e taxiar até o ponto de espera (para quem pousa) e inicia quando livra a pista que pousou.',
  },
  {
    name: 'Torre de Controle',
    code: 'TORRE',
    responsibility:
      'Autorizar decolar na Pista e saída, e para pouso autorizar a entrada no circuito de tráfego.',
  },
  {
    name: 'Controle de Aproximação',
    code: 'CONTROLE',
    responsibility:
      'Organizar o tráfego que chega e sai em um terminal (são aeródromos próximos ao destino).',
  },
  {
    name: 'Centro de Controle',
    code: 'CENTRO',
    responsibility:
      'Responsável pelas aerovias. Se não tiver nenhum órgão, a única coordenação que não faz é as do Controle de Solo.',
  },
];

export const PhraseologyTab: React.FC<PhraseologyTabProps> = ({
  plan,
  originAerodrome,
  destinationAerodrome,
  originActiveRunway,
  destinationActiveRunway,
  predominantAltitudeCode,
  totalEnduranceFormatted,
}) => {
  const callsign = plan.callsign.trim().toUpperCase() || 'XXX';
  const shortCallsign =
    plan.callsign.trim().length >= 3
      ? plan.callsign.trim().toUpperCase().slice(-3)
      : callsign;

  const originIcao = plan.origin.icao.trim().toUpperCase();
  const destIcao = plan.destination.icao.trim().toUpperCase();
  const altIcao = plan.alternate.icao.trim().toUpperCase() || 'XXXX';

  const originLabel = originAerodrome
    ? `${originAerodrome.name} (${originIcao})`
    : originIcao || '___________';
  const destLabel = destinationAerodrome
    ? `${destinationAerodrome.name} (${destIcao})`
    : destIcao || 'XXXX';

  const depRwy = originActiveRunway || 'XX';
  const arrRwy = destinationActiveRunway || 'XX';

  const qnhOrigin =
    plan.origin.qnhHpa !== '' ? String(plan.origin.qnhHpa) : 'XXXX';
  const qnhDest =
    plan.destination.qnhHpa !== '' ? String(plan.destination.qnhHpa) : 'XXXX';

  const pob = String(plan.crewCount || 1).padStart(2, '0');
  const flightRule = plan.flightRule || 'VFR';

  const altCode = predominantAltitudeCode || 'AXXX ou FXXX';
  const altSpoken = predominantAltitudeCode
    ? predominantAltitudeCode.replace(/^(FL|A|F)/, '')
    : 'XXX';

  const hasEndurance =
    totalEnduranceFormatted && totalEnduranceFormatted !== '00:00:00';
  const enduranceParts = totalEnduranceFormatted.split(':');
  const enduranceSpoken =
    hasEndurance && enduranceParts.length >= 2
      ? `${enduranceParts[0]}h${enduranceParts[1]}min`
      : 'X horas';

  // Derive exit and approach waypoints directly from the Route Legs (Section 6)
  const validWaypoints = plan.legs
    .map((l) => l.waypoint.trim().toUpperCase())
    .filter((wp) => wp && wp !== destIcao && wp !== altIcao);

  const exitProfile = validWaypoints[0] || 'XXX';
  const approachProfile =
    validWaypoints.length > 0 ? validWaypoints[validWaypoints.length - 1] : 'XXX';

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
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <PhraseStep
          stepNumber={1}
          title="1) Fraseologia com Tráfego (Autorização de Tráfego - Plano de Voo)"
          dialogues={[
            {
              speaker: 'PILOTO',
              text: `Tráfego ${originLabel}, ${callsign}`,
            },
            {
              speaker: 'PILOTO',
              text: `${callsign}, solicito autorização para ${destLabel}, na regra de voo ${flightRule}, ${altCode}, ciente das informações do METAR.`,
            },
            {
              speaker: 'PILOTO',
              text: `${shortCallsign}, ciente`,
            },
            {
              speaker: 'PILOTO',
              text: `${shortCallsign}, pronto para cópia`,
            },
            {
              speaker: 'ATC',
              text: `${callsign}, autorizado ${destIcao || 'XXXX'}, ${flightRule}, Nível de Voo ${altSpoken} (sem falar o F ou A), rota conforme plano de voo, pista em uso ${depRwy}, aciona transponder XXXX, e ajuste de altímetro ${qnhOrigin}.`,
            },
            {
              speaker: 'PILOTO',
              text: `${callsign}, chamará o Solo ${originLabel} na frequência XXX.XX`,
            },
          ]}
        />

        <PhraseStep
          stepNumber={2}
          title="2) Fraseologia com Solo (Autorização de PushBack, Acionamento e Táxi)"
          dialogues={[
            {
              speaker: 'PILOTO',
              text: `Solo ${originLabel}, ${callsign} pronto para pushback e acionamento no XXX (informar sua localização de estacionamento conforme carta PDC).`,
            },
            {
              speaker: 'ATC',
              text: `${callsign}, autorizado pushback e acionamento, chamará para o táxi.`,
            },
            {
              speaker: 'PILOTO',
              text: `${callsign}, pronto para o táxi, com ${pob} pessoa(s) a bordo, ${enduranceSpoken} de autonomia, alternando ${altIcao}.`,
            },
            {
              speaker: 'ATC',
              text: `${callsign}, autorizado táxi via taxiways XX, até o ponto de espera pista ${depRwy}, ajuste ${qnhOrigin}, aproximando do ponto de espera chamará a Torre ${originLabel} frequência XXX.XX.`,
            },
          ]}
        />

        <PhraseStep
          stepNumber={3}
          title="3) Fraseologia com a Torre (Autorização de Ingresso na Pista em Uso e Decolagem)"
          dialogues={[
            {
              speaker: 'PILOTO',
              text: `Torre ${originLabel}, ${callsign}, no ponto de espera da pista ${depRwy}.`,
            },
            {
              speaker: 'ATC',
              text: `${callsign}, autorizado alinhar na pista ${depRwy}, chamará pronto para decolagem.`,
            },
            {
              speaker: 'PILOTO',
              text: `${callsign}, pronto para decolagem.`,
            },
            {
              speaker: 'ATC',
              text: `${callsign}, livre decolagem na pista ${depRwy}, após decolagem chamará Controle ___________ em XXX.XX.`,
            },
          ]}
        />

        <PhraseStep
          stepNumber={4}
          title="4) Fraseologia com Controle (Após Decolagem no procedimento de Saída)"
          dialogues={[
            {
              speaker: 'PILOTO',
              text: `Controle _______ (controle de aproximação que opera a região de saída do seu voo), ${callsign}, decolado pista ${depRwy}, perfil (saída) ${exitProfile}. Na sua escuta.`,
            },
            {
              speaker: 'ATC',
              text: `${callsign}, subir e manter nível ${altCode} no perfil ${exitProfile} sob vigilância radar.`,
            },
            {
              speaker: 'PILOTO',
              text: `${callsign}, contato Centro XXX na frequência XXX.XX.`,
            },
          ]}
        />

        <PhraseStep
          stepNumber={5}
          title="5) Fraseologia com Centro (Comunicação em rota)"
          dialogues={[
            {
              speaker: 'PILOTO',
              text: `Centro XXX (nome do centro que opera a região de rota do seu voo), ${callsign}, na sua escuta.`,
            },
            {
              speaker: 'ATC',
              text: `${callsign}, subir e manter nível ${altCode} sob vigilância radar.`,
            },
            {
              speaker: 'PILOTO',
              text: `${callsign}, chamará o Centro XXX na frequência XXX.XX ou chamará o Controle XXX na frequência XXX.XX.`,
            },
          ]}
        />

        <PhraseStep
          stepNumber={6}
          title="6) Fraseologia com Controle (Procedimento de Aproximação para Pouso)"
          dialogues={[
            {
              speaker: 'PILOTO',
              text: `Controle XXX (nome do controle que opera a região de chegada do seu voo), ${callsign}, na sua escuta (QNH ${qnhDest}).`,
            },
            {
              speaker: 'ATC',
              text: `${callsign}, desce via ${approachProfile} sob vigilância radar, informará no localizador da pista ${arrRwy}, vigilância radar.`,
            },
            {
              speaker: 'PILOTO',
              text: `${callsign}, estabilizado no localizador / aproximação da pista ${arrRwy}.`,
            },
            {
              speaker: 'ATC',
              text: `${callsign}, trem de pouso checado, chamará a Torre ${destLabel} em XXX.XX (frequência da torre).`,
            },
          ]}
        />

        <PhraseStep
          stepNumber={7}
          title="7) Fraseologia com a Torre (Procedimento de pouso)"
          dialogues={[
            {
              speaker: 'PILOTO',
              text: `Torre ${destLabel}, ${callsign} na final pista ${arrRwy}, baixado e travado com visual.`,
            },
            {
              speaker: 'ATC',
              text: `${callsign}, pouso autorizado na pista ${arrRwy}.`,
            },
            {
              speaker: 'PILOTO',
              text: `${callsign}, chamará Solo ${destLabel} na frequência XXX.XX.`,
            },
          ]}
        />

        <PhraseStep
          stepNumber={8}
          title="8) Fraseologia com Solo (Procedimento de táxi e corte dos motores)"
          dialogues={[
            {
              speaker: 'PILOTO',
              text: `Solo ${destLabel}, ${callsign}, livrou pista ${arrRwy} via taxiway XXX.`,
            },
            {
              speaker: 'ATC',
              text: `${callsign}, segue táxi via XXX, até o gate / pátio XXX na sua escuta até o corte.`,
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
              <span>Coordenação Top-Down</span>
            </div>
            <p className="mt-1 leading-relaxed">
              Na ausência de um órgão local ativo, o órgão imediatamente superior assume suas atribuições (Torre assume Solo; Controle assume Torre/Solo; Centro assume Controle/Torre). Sem nenhum ATC ativo na área, reporte intenções na frequência livre / UNICOM (122.800).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
