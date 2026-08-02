(async function(){
//11
if(window.studentFlashcardOpen){
    document.getElementById("studentFlashcardOverlay")?.remove();
    window.studentFlashcardOpen=false;
    return;
}

window.studentFlashcardOpen=true;


/* ================= STUDENTS ================= */

function decodeName(str){
    return (str || "")
        .replace(/&#39;|&apos;|&#x27;/g,"'")
        .trim();
}


let students=[];


/* ================= CLASS DETECTION ================= */

let selectedClasses = [];


const classLinks =
[...document.querySelectorAll('a[href*="/TAC/ClassRoster?SectionKey="]')];


if(classLinks.length){

    const classes =
    classLinks.map(a=>{

        const url = new URL(a.href);

        return {

            name:a.textContent.trim(),

            period:
            url.searchParams.get("Periods") || "",

            url:a.href

        };

    });


    selectedClasses =
    await chooseClasses(classes);


}
else if(location.href.includes("/TAC/ClassRoster")){

    selectedClasses = [{
        name:document.title,
        period:"",
        url:location.href
    }];

}
else{

    alert("No classes found.");
    return;

}


if(!selectedClasses.length){

    return;

}


    /* ================= STYLE ================= */
function chooseClasses(classes){

return new Promise(resolve=>{


const box=document.createElement("div");

box.style.cssText=`
position:fixed;
top:50%;
left:50%;
transform:translate(-50%,-50%);
background:white;
color:black;
padding:20px;
z-index:1000001;
max-height:80vh;
overflow:auto;
`;


box.innerHTML="<h3>Select Classes</h3>";


classes.forEach((c,i)=>{

const label=document.createElement("label");

label.style.display="flex";

label.innerHTML=`

<input type="checkbox" value="${i}">
${c.period} - ${c.name}

`;

box.appendChild(label);

});


const btn=document.createElement("button");

btn.textContent="Load";


btn.onclick=()=>{

const selected =
[...box.querySelectorAll("input:checked")]
.map(x=>classes[x.value]);


box.remove();

resolve(selected);

};


box.appendChild(btn);

document.body.appendChild(box);


});

}




    
const style=document.createElement("style");

style.textContent=`

#studentFlashcardOverlay{

position:fixed;
top:0;
left:0;
width:100vw;
height:100vh;
background:#222;
z-index:999999;
font-family:Arial;
display:flex;
flex-direction:column;
color:white;

}


.sfBar{

height:45px;
display:flex;
align-items:center;
gap:8px;
padding:5px;
background:#111;

}


.sfBar button{

padding:7px 12px;

}

.sfBody{

flex:1;
display:flex;
justify-content:center;
align-items:stretch;
min-height:0;
overflow:hidden;

}


.sfCard{

width:350px;
height:500px;
background:white;
color:black;
border-radius:15px;
overflow:hidden;
box-shadow:0 5px 20px black;
cursor:pointer;
display:flex;
flex-direction:column;

}

.matchLabel{
    position:absolute;
    bottom:0;
    left:0;
    width:100%;
    height:50%;
    background:white;
    color:black;
    display:none;
    align-items:center;
    justify-content:center;
    text-align:center;
    overflow:hidden;
    font-weight:bold;
    padding:2px;
    box-sizing:border-box;
    pointer-events:none;
}


.sfCard img{

width:100%;
height:75%;
object-fit:cover;

}


.sfName{

height:25%;
display:flex;
align-items:center;
justify-content:center;
font-size:32px;
font-weight:bold;
text-align:center;
padding:10px;

}


.sfQuestion{

font-size:40px;
font-weight:bold;
text-align:center;

}


.sfOptions{

display:grid;
gap:10px;
margin-top:20px;

}


.sfOptions button{

font-size:20px;
padding:12px;

}


.sfBottom{

height:30px;
min-height:30px;
padding:5px;
text-align:center;
box-sizing:border-box;

}


`;

document.head.appendChild(style);



/* ================= HTML ================= */

const overlay=document.createElement("div");

overlay.id="studentFlashcardOverlay";

overlay.innerHTML=`

<div class="sfBar">

<button id="sfFlash">
Flashcards
</button>

<button id="sfQuiz">
Multiple Choice
</button>

<button id="sfType">
Type Name
</button>

<button id="sfMatch">
Matching
</button>

<button id="sfShuffle">
Shuffle
</button>

<button id="sfClose">
X
</button>

</div>


<div class="sfBody">

<div id="sfRemoved"
style="
width:220px;
background:#111;
padding:10px;
overflow:auto;
display:none;
">

<b>Removed Students</b>

<div id="sfRemovedList"></div>

</div>


<div id="sfContent"></div>

</div>


<div class="sfBottom">

<span id="sfScore"></span>

</div>

`;

document.body.appendChild(overlay);
document.getElementById("sfContent").innerHTML = `
<div class="sfQuestion">
Loading students...
</div>
`;


/* ================= LOAD STUDENTS ================= */

(async ()=>{

for(const cls of selectedClasses){

    const roster =
    await getClassStudents(cls.url);

    students.push(...roster);

}


students =
[...new Map(
    students.map(s=>[s.id,s])
).values()];


console.log("STUDENTS:",students);


studySet=[...students];

reset();


})();




console.log("STUDENTS:",students);


    async function getClassStudents(url){

const html =
await $.get(url);


const start =
html.indexOf(
"SunGard.Tac.ClassRoster.Init"
);


const end =
html.indexOf(");",start);



let text =
html.substring(start,end+2)
.replace(
/^SunGard\.Tac\.ClassRoster\.Init\(/,
""
)
.replace(/\);$/,"");



let args=[];

eval("args=["+text+"]");


return args[3]
.map(s=>({

id:s.StudentId,

name:decodeName(
s.StudentNameLastFirst
),

photo:
"/TAC/StudentDetailsDrawer/GetStudentPhoto?studentId="
+encodeURIComponent(s.StudentId)

}))

.filter(s=>s.id);


}






/* ================= STATE ================= */

let mode="flash";

let matchingAssignments = {};

let deck=[];

let studySet=[...students];

let removedStudents=[];

let current=null;

let flipped=false;

let correct=0;

let total=0;



function shuffle(arr){

return [...arr].sort(
()=>Math.random()-0.5
);

}



function reset(){

deck=shuffle(studySet);

correct=0;
total=0;

next();

}



function next(){

if(!studySet.length){

document.getElementById("sfContent").innerHTML=
`
<div class="sfQuestion">
No students in study set
</div>
`;

return;

}


/*
Refill deck when empty
*/

if(!deck.length){

    deck = shuffle(studySet);

}


current = deck.pop();

console.log("CURRENT:", current);

flipped=false;

if(mode==="flash")
    renderFlash();

if(mode==="quiz")
    renderQuiz();

if(mode==="type")
    renderType();


}


function updateRemovedList(){

const panel =
document.getElementById("sfRemoved");

const list =
document.getElementById("sfRemovedList");


if(!removedStudents.length){

    panel.style.display="none";
    return;

}


panel.style.display="block";

list.innerHTML="";


removedStudents
.sort((a,b)=>a.name.localeCompare(b.name))
.forEach(student=>{


const item=document.createElement("div");


item.textContent=student.name;


item.style.cssText=`

background:white;
color:black;
margin:5px 0;
padding:6px;
cursor:pointer;
border-radius:5px;

`;


item.onclick=()=>{



    removedStudents =
        removedStudents.filter(
            s=>s.id !== student.id
        );


    if(!studySet.some(
        s=>s.id === student.id
    )){

        studySet.push(student);

    }


    deck.push(student);


    updateRemovedList();


};


list.appendChild(item);


});


}

function renderFlash(){

console.log("RENDER FLASH:", current);

const box=document.getElementById("sfContent");


box.innerHTML=`

<div class="sfCard">

<img loading="lazy" src="${current.photo}">

<div class="sfName">
?
</div>

<button id="removeStudent"
style="
display:none;
font-size:18px;
padding:8px;
">
Remove from study set?
</button>

</div>

`;


const card=
box.querySelector(".sfCard");


const name=
card.querySelector(".sfName");


const removeBtn=
card.querySelector("#removeStudent");


card.onclick=()=>{

console.log("CARD CLICKED");
console.log("NAME BEFORE:", name.textContent);
console.log("CURRENT NAME:", current.name);


if(name.textContent.trim()==="?"){

    console.log("REVEALING NAME");

    name.textContent=current.name;

    removeBtn.style.display="block";

    console.log("REMOVE BUTTON DISPLAY:", removeBtn.style.display);

}
else{

    console.log("MOVING NEXT");

    total++;

    next();

}


};


removeBtn.onclick=(e)=>{

console.log("REMOVE CLICKED");
console.log("REMOVING:", current);


e.stopPropagation();


studySet =
studySet.filter(
s=>s.id!==current.id
);


removedStudents.push(current);


updateRemovedList();


total++;

next();


};


}


function renderMatching(){

const box=document.getElementById("sfContent");

let placements = {};
let selectedNameId = null;

const studentsForGame = shuffle([...students]);


box.innerHTML=`

<div id="matchWrapper" style="
position:relative;
display:flex;
height:100%;
width:100%;
min-height:0;
overflow:hidden;
gap:10px;
box-sizing:border-box;
">


<div style="
flex:1;
height:100%;
min-height:0;
display:flex;
flex-direction:column;
overflow:hidden;
">


<div id="matchNames"

style="
display:flex;
flex-wrap:wrap;
justify-content:center;
align-content:start;

gap:5px;

padding:5px;
box-sizing:border-box;

flex-shrink:0;

">

</div>


<div id="matchImages"

style="
flex:1;

min-height:0;

display:grid;

gap:5px;

overflow:hidden;

align-content:center;
justify-content:center;

">

</div>


<button id="checkMatches"

style="
height:45px;
min-height:45px;
max-height:45px;

font-size:20px;

margin:5px;

flex-shrink:0;
">

Check Answers

</button>


</div>


<div id="matchMissed"
style="
display:none;
position:absolute;
right:10px;
top:10px;
width:220px;
background:white;
color:black;
padding:10px;
overflow:auto;
z-index:10;
">

<b>Incorrect</b>

<div id="missedList"></div>

</div>


</div>

`;



const namesDiv =
document.getElementById("matchNames");

const imagesDiv =
document.getElementById("matchImages");




/* ---------- NAMES ---------- */


[...studentsForGame]
.sort((a,b)=>a.name.localeCompare(b.name))
.forEach(student=>{


const tile=document.createElement("div");


tile.textContent=student.name;

tile.dataset.id=student.id;

tile.draggable=true;


tile.style.cssText=`

background:white;
color:black;
border:2px solid #999;
border-radius:5px;
padding:5px;
cursor:grab;
font-size:clamp(10px,1.2vw,18px);

`;



tile.ondragstart=e=>{

e.dataTransfer.setData(
"studentId",
student.id
);

};


tile.onclick=()=>{

    if(selectedNameId===student.id){

        selectedNameId=null;
        tile.style.outline="";

        return;
    }


    document
    .querySelectorAll("#matchNames div")
    .forEach(t=>t.style.outline="");


    selectedNameId=student.id;

    tile.style.outline="4px solid blue";

};


namesDiv.appendChild(tile);


});

const nameHeight = namesDiv.scrollHeight;

namesDiv.style.height = nameHeight + "px";
namesDiv.style.minHeight = nameHeight + "px";
namesDiv.style.maxHeight = nameHeight + "px";


/* ---------- IMAGES ---------- */


shuffle([...studentsForGame])
.forEach(student=>{


const cell=document.createElement("div");


cell.className="matchCell";


cell.dataset.correctId =
student.id;


cell.style.cssText=`

position:relative;
overflow:hidden;
border:2px solid #aaa;
background:#222;

`;



cell.innerHTML=`

<img loading="lazy"
src="${student.photo}"

style="
width:100%;
height:100%;
object-fit:cover;
display:block;
">


<div class="matchLabel"></div>

`;
cell.onclick=()=>{


    if(placements[cell.dataset.correctId]){


        const removed =
        placements[cell.dataset.correctId];


        delete placements[cell.dataset.correctId];


        selectedNameId=null;


        update();

        return;

    }



    if(selectedNameId){


        Object.keys(placements).forEach(key=>{

            if(placements[key]===selectedNameId){

                delete placements[key];

            }

        });


        placements[cell.dataset.correctId]=selectedNameId;


        selectedNameId=null;


        update();

    }


};

cell.ondragover=e=>{

e.preventDefault();

};



cell.ondrop=e=>{

e.preventDefault();


const id =
e.dataTransfer.getData("studentId");


if(!id) return;



/*
Remove this student from any previous cell
*/

Object.keys(placements).forEach(key=>{

    if(placements[key]===id){

        delete placements[key];

    }

});



/*
Replace whatever was in this cell
*/

placements[cell.dataset.correctId]=id;


update();


};



imagesDiv.appendChild(cell);


});

/* ---------- GRID ---------- */

requestAnimationFrame(()=>{


const width = imagesDiv.clientWidth;
const height = imagesDiv.clientHeight;


const n = studentsForGame.length;


/*
Find best columns.
Try every possible number of columns
and choose the largest square size.
*/

let best = {
    size:0,
    cols:1,
    rows:n
};


for(let cols=1; cols<=n; cols++){


    const rows = Math.ceil(n / cols);


    const gap = 5;


    const size = Math.floor(
        Math.min(
            (width - (cols-1)*gap) / cols,
            (height - (rows-1)*gap) / rows
        )
    );


    if(size > best.size){

        best = {
            size,
            cols,
            rows
        };

    }

}



/*
Apply winning layout
*/

imagesDiv.style.gridTemplateColumns =
`repeat(${best.cols}, ${best.size}px)`;


imagesDiv.style.gridTemplateRows =
`repeat(${best.rows}, ${best.size}px)`;


console.log(
    "MATCH GRID:",
    best.cols,
    "columns",
    best.rows,
    "rows",
    best.size+"px"
);


});



/* ---------- DISPLAY UPDATE ---------- */


function update(){

    
document
.querySelectorAll("#matchNames div")
.forEach(tile=>{

    tile.style.outline="";

});

document
.querySelectorAll(".matchCell")
.forEach(cell=>{


const label =
cell.querySelector(".matchLabel");


label.innerHTML="";

label.style.display="none";



const id =
placements[cell.dataset.correctId];



if(id){


const student =
students.find(
s=>s.id===id
);



label.textContent = student.name;

label.style.fontSize = 
Math.min(
    cell.clientWidth / (student.name.length * 0.55),
    cell.clientHeight * 0.18
) + "px";


label.dataset.id=id;


label.draggable=true;


label.style.display="flex";



label.ondragstart=e=>{

e.dataTransfer.setData(
"studentId",
id
);

};


}



});



const nameTiles =
[...document.querySelectorAll("#matchNames div")];


const placedIds =
Object.values(placements);


nameTiles.forEach(tile=>{

    tile.style.display =
        placedIds.includes(tile.dataset.id)
        ? "none"
        : "block";

});


nameTiles
.sort((a,b)=>
    a.textContent.localeCompare(b.textContent)
)
.forEach(tile=>{
    namesDiv.appendChild(tile);
});


}



/* ---------- CHECK ---------- */


document
.getElementById("checkMatches")
.onclick=()=>{


let missed=[];


document
.querySelectorAll(".matchCell")
.forEach(cell=>{


const answer =
placements[
cell.dataset.correctId
];


if(answer===cell.dataset.correctId){

cell.style.border =
"5px solid green";

}
else{

cell.style.border =
"5px solid red";


const student =
students.find(
s=>s.id===cell.dataset.correctId
);


if(student)
missed.push(student.name);


}


});



const panel =
document.getElementById("matchMissed");


panel.style.display="block";


document
.getElementById("missedList")
.innerHTML =
missed.length
?
missed.join("<br>")
:
"<span style='color:green'>Perfect!</span>";

};


}




function renderQuiz(){

const box=document.getElementById("sfContent");


let choices=shuffle([

    current,

    ...shuffle(
        students.filter(
            s=>s.id!==current.id
        )
    ).slice(0,3)

]);


box.innerHTML=`

<div style="
text-align:center;
margin-bottom:15px;
">

<div style="
font-size:42px;
font-weight:bold;
height:55px;
"
id="sfAnswerName">
</div>

<img loading="lazy"
style="
width:350px;
height:350px;
object-fit:cover;
border-radius:15px;"
src="${current.photo}">

</div>


<div class="sfOptions"></div>

`;


const options =
box.querySelector(".sfOptions");


let answered=false;


choices.forEach(c=>{

const btn=document.createElement("button");

btn.textContent=c.name;


btn.style.cssText=`
font-size:22px;
padding:12px;
border-radius:8px;
border:2px solid #aaa;
cursor:pointer;
`;


btn.onclick=()=>{

    if(answered) return;

    answered=true;

    total++;


    /* always reveal correct answer */
    const buttons =
    [...options.querySelectorAll("button")];


    buttons.forEach(b=>{

        if(b.textContent===current.name){

            b.style.background="#4CAF50";
            b.style.color="white";

        }

    });


    if(c.id===current.id){

        correct++;

        document.getElementById("sfAnswerName")
            .textContent=current.name;


        setTimeout(next,800);

    }
    else{

        btn.style.background="#f44336";
        btn.style.color="white";

        document.getElementById("sfAnswerName")
            .textContent=current.name;


        /* longer incorrect pause */
        setTimeout(next,1500);

    }


};


options.appendChild(btn);


});


}



function renderType(){

const box=document.getElementById("sfContent");


box.innerHTML=`

<img loading="lazy"
style="
width:350px;
height:350px;
object-fit:cover;
border-radius:15px;"
src="${current.photo}">


<div style="margin-top:20px;text-align:center">

<input id="sfInput"
style="
font-size:22px;
padding:8px;
width:300px;"
placeholder="Type name">


<button id="sfSubmit">
Check
</button>

</div>

`;



box.querySelector("#sfSubmit").onclick=()=>{

const answer=
box.querySelector("#sfInput")
.value.trim()
.toLowerCase();


total++;


if(answer===current.name.toLowerCase()){

correct++;

alert("Correct!");

}
else{

alert(current.name);

}


next();

};



}


/* ================= BUTTONS ================= */

document.getElementById("sfFlash").onclick=()=>{

mode="flash";
updateRemovedList();
reset();

};


document.getElementById("sfQuiz").onclick=()=>{

mode="quiz";
reset();

};


document.getElementById("sfMatch").onclick=()=>{

    mode="match";
    renderMatching();

};

document.getElementById("sfType").onclick=()=>{

mode="type";
reset();

};


document.getElementById("sfShuffle").onclick=()=>{

if(mode==="match"){
    renderMatching();
}
else{
    reset();
}

};


document.getElementById("sfClose").onclick=()=>{

overlay.remove();
style.remove();
window.studentFlashcardOpen=false;

};




})();
