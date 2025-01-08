
import { BrotliDecode } from './decode.min.js'

let sIndex = new Map()
let originalSauce
let subsData,liesData,liarData /// mmmm, globals.

async function brGet(url) {
    const response = await fetch(url)
    const compressedData = await response.arrayBuffer()
    return new TextDecoder().decode(BrotliDecode(new Uint8Array(compressedData))).split('\0');   
}

function upsell(text) {
    const offerings = sIndex.get(soundex(text))
    if(offerings) {
        selectLieIndex(offerings[randomFrom(offerings)])
    }
}

function soundex(word) {
    const firstLetter = word[0].toUpperCase()
    const soundexMapping = {
        B: 1, F: 1, P: 1, V: 1,
        C: 2, G: 2, J: 2, K: 2, Q: 2, S: 2, X: 2, Z: 2,
        D: 3, T: 3,
        L: 4,
        M: 5, N: 5,
        R: 6
    }
    const chars = word.toUpperCase().split('').slice(1).map(char => {
        if (soundexMapping[char]) {
            return soundexMapping[char];
        } else {
            return ''
        }
    })

    const filteredChars = chars.filter((char, index) => char !== chars[index - 1])

    return (firstLetter + filteredChars.join('')).padEnd(4, '0').slice(0, 4)
}

function index() {
    for(const lieIndex in liesData) {
        const words = liesData[lieIndex].match(/\b\w+\b/g) || []
        for(const sToken of words.map(word => soundex(word))) {
            if(!sIndex.get(sToken)) {
                sIndex.set(sToken, [lieIndex])            
            } else {
                sIndex.get(sToken).push(lieIndex)
            }
        }
    }
}

function decorate(text) {
    const fragment = document.createDocumentFragment();
    let delimiter = ''
    // TODO: split more carefully and restore the ^\s as a fragment
    text.split(/\s+/).forEach((word, index) => {
        const span = document.createElement('span')
        span.textContent = delimiter + word
        fragment.appendChild(span)
        delimiter = ' '
    })
    return fragment
}

function formatDate(date) {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const day = days[date.getDay()];
    const dateNum = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    const suffix = dateNum % 10 === 1 && dateNum !== 11 ? "st"
        : dateNum % 10 === 2 && dateNum !== 12 ? "nd"
        : dateNum % 10 === 3 && dateNum !== 13 ? "rd"
        : "th";

    return `${day} the ${dateNum}${suffix} of ${month} ${year}`;
}

const dateToLindex = (date) => {
    const N = liesData.length
    const daysSinceEpoch = Math.floor((date - new Date(0)) / (1000 * 60 * 60 * 24));
    return ((daysSinceEpoch * 2654435761) % 2**32) % (N + 1);  // hash it right up
  }

function randomFrom(anArray) {
    return Math.floor(Math.random() * anArray.length)
}

function selectLieIndex(lindex, subElId='subP',liarElId='liarP',lieElId='lieP') {
    document.getElementById(subElId).textContent = subsData[lindex]
    document.getElementById(liarElId).textContent = liarData[lindex]
    document.getElementById(lieElId).replaceChildren(decorate(liesData[lindex]))
    document.getElementById(lieElId).addEventListener('click', (event) => upsell(event.target.innerText.trim()))
}

function getLieByIndex(lindex) {
    return { submittedOn: subsData[lindex], liar: liarData[lindex], body: liesData[lindex] }
}

function setHeader(pageCode) {
    for(let check of [`dwol`,'lotd','awol','dol','cl','gl','sal']) {    
        const swap = (check == pageCode) ? [0,1] : [1,0]
        const image = document.querySelector(`table#hdr img[src="${check}${swap[0]}.gif"]`);
        if(image) { image.src = `${check}${swap[1]}.gif` }              
    }
}

function swap(id, newHtml) {
    const span = document.createElement("span")
    span.innerHTML = newHtml
    document.getElementById(id).replaceChildren(span)
}

function lbreak() { 
    return `<img alt="----------------------------------------" height="8" src="lbreak.gif" width="600" />`
}
function rbreak() { 
    return `<img alt="----------------------------------------" height="8" src="rbreak.gif" width="600" />`
}

async function commonInit() {
    [subsData,liesData,liarData] = await Promise.all([
        brGet('subs.br'),
        brGet('lies.br'),
        brGet('liars.br'),
    ])
    originalSauce = document.getElementById('contentP').innerHTML
    for(let page of [`dwol`,'lotd','awol','dol','cl','gl','sal']) {    
        document.querySelector(`a#${page}`).addEventListener('click', (event) => select(page))
    }
    index()
}

function h4(text) { return `<h4>${text}</h4>`}
function h2(text) { return `<h2 style="text-align:left;">${text}</h2>`}
function h6(text) { return `<h6 style="text-align:left;">${text}</h6>`}

const pages = {
    dwol : function() { return originalSauce },

    lotd : function() {
        const today = new Date()
        const lie = getLieByIndex(dateToLindex(today))            
        return h4('The lie of today, ' + formatDate(today)) + lbreak() + h2(lie.body) + h6(lie.liar) + h6(lie.submittedOn)
    },

    awol : function() {
        const bits = []
        for(let history=1; history < 7; history++) {
            const currentDate = new Date()
            currentDate.setDate(currentDate.getDate() - history)
            const lie = getLieByIndex(dateToLindex(currentDate))       
            bits.push(history > 1 ? lbreak() : '')
            bits.push(h4('The lie of last ' + formatDate(currentDate)), lbreak(), h2(lie.body), h6(lie.liar), h6(lie.submittedOn))
        } 
        return bits.join('')
    },

    dol : function() {
        return `<table width="600px" align="center">
            <tr>
                <td>
<P><H2>Search the World's Largest Repository of Lies</H2>
</CENTER> The database now contains over 4,098 lies, on every
topic from <B>a</B>rtichokes to <B>z</B>ebra.<P>

<center><FORM> 
<table border=3 width=90%>

<tr><td align=center bgcolor="#eeeeee"><table width=90% cellpadding=5
units=relative colspec="L3 C1 R1"> <tr valign=middle> <td
bgcolor="#eeeeee" ALIGN=LEFT>Topic : <INPUT NAME="w" SIZE=40></TD><td
bgcolor="#eeeeee" ALIGN=CENTER></TD><TD bgcolor="#eeeeee"
ALIGN=RIGHT><INPUT TYPE="submit" VALUE="Search..."><P></CENTER></td></tr> </td></tr>

<TR><TD bgcolor="#eeeeee" ALIGN=CENTER colspan=3>Search for at most
<SELECT NAME="t"><OPTION>1 second<OPTION>1 minute<OPTION>1
hour<OPTION>1 day</SELECT>and return <SELECT NAME="n"><OPTION>A
 single lie<OPTION>1-10 lies<OPTION>10-100 lies<OPTION>100 or more
 lies</SELECT></TD></TR>

<TR><TD bgcolor="#eeeeee" ALIGN=CENTER colspan=3><input
type="checkbox" name="s" value="on"> Allow partial word
matches<P></td></tr>

</table></table></FORM>

${lbreak()}

<H2>Search by Liar</H2></CENTER><p>
To find all the lies from one source, use part of either the persons
name or email address (e.g. 'gavin' for all the lies by people called
Gavin, or 'wombat.com' for all the lies contributed from wombat
addresses)<p>

<center><FORM> <table border=3 width=90%><tr><td align=center
bgcolor="#eeeeee"><table width=90% cellpadding=5 units=relative
colspec="L2 C1 R1"> <tr valign=middle> <td bgcolor="#eeeeee"
ALIGN=LEFT> Liar: <INPUT NAME="f" SIZE=40></TD><td bgcolor="#eeeeee"
ALIGN=CENTER></TD><TD bgcolor="#eeeeee" ALIGN=RIGHT><INPUT
TYPE="submit" VALUE="Search..."><P></CENTER></td></tr>
</table></td></tr></table></FORM><P>

${rbreak()}

<H2>Browse Alphabetically</H2><P> The <EM>browse bar</EM> lets you
browse randomly selected subjects.<P> <table border=3 cellpadding=5
width=90% ALIGN=CENTER> <tr> <td bgcolor="#eeeeee"> <CENTER> <A
HREF="/hancockd-bin/elsie2?l+a">A</A>, <A
HREF="/hancockd-bin/elsie2?l+b">B</A>, <A
HREF="/hancockd-bin/elsie2?l+c">C</A>, <A
HREF="/hancockd-bin/elsie2?l+d">D</A>, <A
HREF="/hancockd-bin/elsie2?l+e">E</A>, <A
HREF="/hancockd-bin/elsie2?l+f">F</A>, <A
HREF="/hancockd-bin/elsie2?l+g">G</A>, <A
HREF="/hancockd-bin/elsie2?l+h">H</A>, <A
HREF="/hancockd-bin/elsie2?l+i">I</A>, <A
HREF="/hancockd-bin/elsie2?l+j">J</A>, <A
HREF="/hancockd-bin/elsie2?l+k">K</A>, <A
HREF="/hancockd-bin/elsie2?l+l">L</A>, <A
HREF="/hancockd-bin/elsie2?l+m">M</A>, <A
HREF="/hancockd-bin/elsie2?l+n">N</A>, <A
HREF="/hancockd-bin/elsie2?l+o">O</A>, <A
HREF="/hancockd-bin/elsie2?l+p">P</A>, <A
HREF="/hancockd-bin/elsie2?l+q">Q</A>, <A
HREF="/hancockd-bin/elsie2?l+r">R</A>, <A
HREF="/hancockd-bin/elsie2?l+s">S</A>, <A
HREF="/hancockd-bin/elsie2?l+t">T</A>, <A
HREF="/hancockd-bin/elsie2?l+u">U</A>, <A
HREF="/hancockd-bin/elsie2?l+v">V</A>, <A
HREF="/hancockd-bin/elsie2?l+w">W</A>, <A
HREF="/hancockd-bin/elsie2?l+x">X</A>, <A
HREF="/hancockd-bin/elsie2?l+y">Y</A>, <A
HREF="/hancockd-bin/elsie2?l+z">Z</A></td></tr> </table><P>                            
                </td>
            </tr>
        </table>`   
    },

    cl : function() {
        return `
<H3>Our Esteemed Celebrity Liar</H3><H1><A
HREF="http://www.gbnet.net:80/~stephenf/index.html">Sir Stephen
Fry</A></H1>
${rbreak()}
<H2 style="text-align:left"> 
<P><EM>Journalism is an honourable
profession, attracting some of the most talented and thoughtful minds
in the world.  Its aim is to inform, elucidate and uplift the human
spirit.</EM><P>

<P>Welshmen are allergic to pajamas.</P>

<P><EM>The ingestion of many milligrams of vitamin C will prevent you from
getting a cold.</EM></P>

<P>William Shakespeare's middle name was Colin.</P>

<P><EM>The internet is American.</EM></P>

<P>Belgian males remove their trousers while driving.</P>
</H2>

<h6 style="text-align:left">Submitted: Monday, 21 Aug 1995</h6>`   
    },

    gl : function() {
        return `<table width="600px" align="center">
            <tr>
                <td>                                      
                </td>
            </tr>
        </table>`   
    },

    sal : function() {
        return `<table width="600px" align="center">
            <tr>
                <td>                                      
                </td>
            </tr>
        </table>`   
    }
}

function select(page) {
    setHeader(page)
    swap('contentP', pages[page]())  
}

window.onload = async () => { await commonInit() }


