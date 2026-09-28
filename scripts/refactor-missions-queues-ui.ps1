# =====================================================
# 1TASK UI REFRESH
# Missions + Queues redesign
# Frontend ONLY
# =====================================================

Write-Host "Starting UI redesign..." -ForegroundColor Cyan


# -----------------------------------------------------
# CREATE DIRECTORIES
# -----------------------------------------------------

$folders = @(
"components/missions",
"components/queues"
)


foreach($folder in $folders){

    if(!(Test-Path $folder)){
        New-Item -ItemType Directory -Path $folder | Out-Null
        Write-Host "Created $folder"
    }

}



# =====================================================
# MISSIONS COMPONENTS
# =====================================================


@'

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
Suivez vos missions en temps réel.
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

'@ | Out-File `
".\components\missions\missions-page.tsx" `
-Encoding utf8



# =====================================================
# QUEUES COMPONENT
# =====================================================


@'


"use client";


type Queue={

id:string;
name:string;
code:string;
department:{
name:string
};

_count:{
tickets:number;
teams:number;
};

manager?:{
name:string
}|null;

};



export default function QueuesPage({

queues

}:{

queues:Queue[]

}){


return (

<div className="
space-y-6
">


<header>

<h1 className="
text-3xl
font-black
">

Files support

</h1>


<p className="
text-slate-500
">

Supervision des équipes.

</p>


</header>



<div className="
grid
gap-6
md:grid-cols-2
">


{

queues.map(queue=>(


<div

key={queue.id}

className="
rounded-2xl
border
bg-white
p-6
shadow-sm
hover:shadow-xl
transition
"

>


<div className="
flex
justify-between
">


<div>

<p className="
text-xs
uppercase
text-slate-400
">

{queue.department.name}

</p>


<h2 className="
text-xl
font-bold
">

{queue.name}

</h2>


<p className="
font-mono
text-xs
text-slate-400
">

{queue.code}

</p>


</div>


<span className="
rounded-full
bg-green-100
px-3
py-1
text-xs
text-green-700
">

ACTIVE

</span>


</div>




<div className="
grid
grid-cols-2
gap-4
mt-6
">


<div className="
rounded-xl
bg-slate-50
p-4
">

<p>
Tickets
</p>

<strong>
{queue._count.tickets}
</strong>


</div>


<div className="
rounded-xl
bg-slate-50
p-4
">

<p>
Equipes
</p>

<strong>
{queue._count.teams}
</strong>


</div>


</div>




<div className="
mt-5
text-sm
text-slate-600
">

Responsable :

<b>
{
queue.manager?.name
||
"Non désigné"
}
</b>


</div>



</div>


))


}


</div>


</div>

)

}

'@ | Out-File `
".\components\queues\queues-page.tsx" `
-Encoding utf8



Write-Host ""
Write-Host "================================"
Write-Host "UI components generated"
Write-Host "================================"
