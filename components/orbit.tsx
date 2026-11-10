import { useId } from "react";

export default function Orbit({ className = "" }: { className?: string }) {
  const key = useId().replace(/[^a-z\d-]/gi, "");
  const fill = (suffix: string) => `url(#${key}-${suffix})`;
  return <svg className={`orbit ${className}`} viewBox="0 0 440 390" fill="none" aria-hidden="true">
    <defs>
      <radialGradient id={key + "-aura"}><stop stopColor="#8274ff" stopOpacity=".56"/><stop offset="1" stopColor="#5540c2" stopOpacity="0"/></radialGradient>
      <radialGradient id={key + "-body"} cx=".32" cy=".22" r=".9">
        <stop stopColor="#ede7ff"/><stop offset=".18" stopColor="#b5a2fd"/><stop offset=".43" stopColor="#7763e3"/><stop offset=".72" stopColor="#302471"/><stop offset=".91" stopColor="#26185b"/><stop offset="1" stopColor="#9984fe"/>
      </radialGradient>
      <linearGradient id={key + "-ring"} x1="38" y1="301" x2="386" y2="72" gradientUnits="userSpaceOnUse">
        <stop stopColor="#af99ff" stopOpacity=".12"/><stop offset=".3" stopColor="#a38cff" stopOpacity=".72"/><stop offset=".51" stopColor="#f7ebff"/><stop offset=".76" stopColor="#a98eff" stopOpacity=".76"/><stop offset="1" stopColor="#bcb0ff" stopOpacity=".24"/>
      </linearGradient>
      <clipPath id={key + "-clip"}><circle cx="239" cy="191" r="91"/></clipPath>
      <pattern id={key + "-grid"} width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".8" fill="#d4cfff" opacity=".42"/></pattern>
    </defs>
    <ellipse cx="240" cy="197" rx="199" ry="167" fill={fill("aura")}/>
    <path d="M26 32h380v321H26z" fill={fill("grid")} opacity=".55"/>
    <circle cx="239" cy="191" r="132" stroke="#c5b8ff" strokeOpacity=".21" strokeDasharray="2 6"/>
    <circle cx="239" cy="191" r="149" stroke="#c5b8ff" strokeOpacity=".13"/>
    <path d="M239 25v332M77 191h327" stroke="#c5b8ff" strokeOpacity=".14" strokeDasharray="2 7"/>
    <g className="orbit-rings">
      <ellipse cx="239" cy="191" rx="190" ry="61" transform="rotate(-29 239 191)" stroke={fill("ring")} strokeWidth="1.5"/>
      <ellipse cx="239" cy="191" rx="165" ry="92" transform="rotate(35 239 191)" stroke="#a494ff" strokeOpacity=".58" strokeWidth="1.1"/>
      <ellipse cx="239" cy="191" rx="174" ry="46" transform="rotate(-29 239 191)" stroke="#9f89ff" strokeOpacity=".28"/>
      <g fill="#e1d7ff"><circle cx="130" cy="265" r="3"/><circle cx="367" cy="122" r="4.5"/><circle cx="135" cy="101" r="3"/><circle cx="353" cy="260" r="4"/></g>
    </g>
    <g className="orbit-sphere">
      <circle cx="239" cy="191" r="91" fill={fill("body")} stroke="#d4c3ff" strokeOpacity=".57"/>
      <g clipPath={fill("clip")} stroke="#e7d9ff" strokeOpacity=".32" strokeWidth=".8">
        {Array.from({length:9}, (_,i) => <ellipse key={i} cx="239" cy="191" rx={16 + i * 10} ry="91" transform="rotate(-34 239 191)"/>)}
        {Array.from({length:8}, (_,i) => <ellipse key={i} cx="239" cy={125 + i * 19} rx={i === 0 || i === 7 ? 59 : 99} ry={9 + i * .5} transform="rotate(-34 239 191)"/>)}
      </g>
      <circle cx="209" cy="153" r="6" fill="#f9f1ff"/><circle cx="209" cy="153" r="13" stroke="#f2e4ff" strokeOpacity=".53"/>
      <circle cx="260" cy="212" r="3" fill="#eedbff"/><circle cx="280" cy="152" r="2" fill="#eedbff"/>
    </g>
    <path d="M71 260c37 22 114 3 197-40s139-102 130-127" stroke={fill("ring")} strokeWidth="1.55"/>
    <g fill="#f3eaff" className="orbit-stars"><path d="M330 59v20m-10-10h20M104 183v14m-7-7h14M360 302v12m-6-6h12" stroke="#dfd2ff" strokeWidth="1.2"/><circle cx="403" cy="205" r="2"/><circle cx="164" cy="62" r="2"/><circle cx="189" cy="319" r="2"/></g>
  </svg>;
}
