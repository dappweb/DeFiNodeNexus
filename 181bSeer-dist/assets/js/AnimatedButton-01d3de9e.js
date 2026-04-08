import{m as e,L as b}from"./vendor-react-407bf44e.js";const f=({children:a,onClick:o,disabled:i=!1,loading:s=!1,variant:t="primary",size:l="md",className:d="",icon:r,fullWidth:n=!1})=>{const m=`
    relative overflow-hidden font-bold rounded-xl transition-all duration-200 
    transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
    flex items-center justify-center gap-2
  `,h={primary:"bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white shadow-lg shadow-indigo-500/40 hover:shadow-indigo-500/60",secondary:"bg-[#1A1532] hover:bg-[#231D42] text-white border border-indigo-500/15 shadow-lg hover:shadow-xl",success:"bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-lg shadow-emerald-500/40",warning:"bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-lg shadow-amber-500/40",danger:"bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white shadow-lg shadow-rose-500/40"},c={sm:"px-3 py-2 text-sm",md:"px-4 py-3 text-base",lg:"px-6 py-4 text-lg"},g=n?"w-full":"";return e.jsxs("button",{onClick:o,disabled:i||s,className:`
        ${m}
        ${h[t]}
        ${c[l]}
        ${g}
        ${d}
      `,children:[t==="primary"&&e.jsx("div",{className:"absolute inset-0 bg-white/20 translate-x-[-100%] animate-[shimmer_2s_infinite]"}),t==="secondary"&&e.jsx("div",{className:"absolute inset-0 bg-white/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300"}),e.jsx("div",{className:"absolute inset-0 overflow-hidden rounded-xl",children:e.jsx("div",{className:"absolute inset-0 bg-white/10 scale-0 rounded-full transition-transform duration-300 group-active:scale-150"})}),e.jsxs("div",{className:"relative flex items-center justify-center gap-2",children:[s&&e.jsx(b,{className:"animate-spin",size:20}),!s&&r&&r,e.jsx("span",{children:a})]})]})};export{f as A};
