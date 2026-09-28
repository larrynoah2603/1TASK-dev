
"use client";


type Mission = {
 id:string;
 code:string;
 name:string;
 status:string;
 dueAt:string|null;
 budgetMinutes:number;
 worklogMinutes:number;
};


export default function MissionsPage({
 missions
}:{
 missions:Mission[]
}){


return (

<div className="
space-y-6
">


<header>

<p className="
text-xs
uppercase
tracking-widest
text-slate-400
">
Portefeuille
</p>


<h1 className="
text-3xl
font-black
text-slate-900
">
Missions
</h1>


<p className="
text-slate-500
">
Suivez vos missions en temps rÃ©el.
</p>


</header>



<div className="
grid
gap-6
md:grid-cols-3
">


{
missions.map((mission)=>(


<div

key={mission.id}

className="
rounded-2xl
border
bg-white
p-5
shadow-sm
hover:shadow-xl
transition
"


>


<div className="
flex
justify-between
">

<span className="
text-xs
font-bold
text-indigo-600
">

{mission.code}

</span>


<span className="
rounded-full
bg-indigo-50
px-3
py-1
text-xs
text-indigo-700
">

{mission.status}

</span>


</div>



<h2 className="
mt-5
font-bold
text-lg
">

{mission.name}

</h2>



<div className="
mt-5
">

<div className="
flex
justify-between
text-xs
">

<span>
Progression
</span>


<span>

{
Math.round(
mission.worklogMinutes /
Math.max(
mission.budgetMinutes,
1
)
*100
)
}%

</span>


</div>


<div className="
mt-2
h-2
rounded-full
bg-slate-100
overflow-hidden
">

<div

className="
h-full
bg-indigo-600
"

style={{
width:
`${Math.min(
100,
mission.worklogMinutes /
Math.max(
mission.budgetMinutes,
1
)
*100
)}%`
}}

/>

</div>


</div>


</div>


))


}


</div>


</div>

)

}

