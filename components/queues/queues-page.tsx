

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
text-[var(--kit-text-2)]
">

Supervision des Ã©quipes.

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
bg-[var(--kit-card)]
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
text-[var(--kit-text-2)]
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
text-[var(--kit-text-2)]
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
bg-[var(--kit-surface-muted)]
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
bg-[var(--kit-surface-muted)]
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
text-[var(--kit-text-2)]
">

Responsable :

<b>
{
queue.manager?.name
||
"Non dÃ©signÃ©"
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

