
import yaml from 'js-yaml';
import fs from 'fs';

import path from 'path';
import {guests} from './guests.js'

const outputRoot = './root'
const wordRegex = /[\p{L}\p{N}\p{Mn}\p{Pc}\u2019]+/gu;


 function formatDate(offset) {

    
    if(offset == 1 ) {
        return 'Yesterday'
    }
    
    const date = new Date()
    date.setDate(date.getDate() - offset)

    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const day = days[date.getDay()];

    if(0 < offset && offset < 5 ) {
        return 'last ' + day
    }

    const dateNum = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    const suffix = dateNum % 10 === 1 && dateNum !== 11 ? "st"
        : dateNum % 10 === 2 && dateNum !== 12 ? "nd"
        : dateNum % 10 === 3 && dateNum !== 13 ? "rd"
        : "th";

    return `${day} the ${dateNum}${suffix} of ${month} ${year}`;
}


function soundex(word) {
    const firstLetter = word[0].toUpperCase();
    const soundexMapping = {
        B: 1, F: 1, P: 1, V: 1,
        C: 2, G: 2, J: 2, K: 2, Q: 2, S: 2, X: 2, Z: 2,
        D: 3, T: 3,
        L: 4,
        M: 5, N: 5,
        R: 6
    };

    const chars = word.toUpperCase().split('').slice(1).map(char => {
        if (soundexMapping[char]) {
            return soundexMapping[char];
        } else {
            return ''; // Ignore vowels and other characters
        }
    });

    const filteredChars = chars.filter((char, index) => char !== chars[index - 1]);

    return (firstLetter + filteredChars.join('')).padEnd(4, '0').slice(0, 4);
}

const stopwordSet = new Set([
        "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can't", "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during", "each",
        "few", "for", "from", "further", "had", "hadn't", "has", "hasn't", "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here", "here's", "hers", "herself", "him", "himself", "his", "how", "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's", "its", "itself", "let's", "me",
        "more", "most", "mustn't", "my", "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours	ourselves", "out", "over", "own", "same", "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such", "than", "that", "that's", "the", "their", "theirs", "them", "themselves", "then", "there", "there's", "these", "they", "they'd", "they'll", "they're", "they've", "this", "those", "through", "to", "too", "under", "until", "up", "very", "was", "wasn't", "we", "we'd", "we'll",
        "we're", "we've", "were", "weren't", "what", "what's", "when", "when's", "where", "where's", "which", "while", "who", "who's", "whom", "why", "why's", "with", "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours", "yourself", "yourselves"
    ])



const footer = `</P><IMG SRC="lbreak.gif" WIDTH=600 HEIGHT=8 ALT="------------"><P><IMG SRC="fbreak.gif" WIDTH=600 HEIGHT=9 ALT="--(c)1994...2025--"></P></CENTER></BODY></HTML>`

function makeHeader(page) {
    function img(current, destination) {
        return destination + (current === destination ? '1' : '0') + '.gif'
    }

    return `<HTML><HEAD><TITLE>Dave's Web of Lies</TITLE><META name="description" content="Dave's Web of Lies">
<META name="keywords" content="daves,web,of,lies,untruths,fibs,porkies,liar,liar,pants,on,fire,damned,lies,statistics">
<LINK rel="stylesheet" href="dwol.css"></HEAD><BODY><TABLE ID="hdr" CELLPADDING="0" CELLSPACING="0" BORDER=0 ALIGN=CENTER><TR>
<TD><A ID="dwol" HREF="dwol.htm"><IMG SRC="${img(page,'dwol')}" WIDTH=124 HEIGHT=48 BORDER=0 ALT="Daves's Web of Lies"></A></TD>
<TD><A ID="lotd" HREF="lotd.htm"><IMG SRC="${img(page,'lotd')}" WIDTH=79 HEIGHT=48 BORDER=0 ALT="Lie of the Day"></A></TD>
<TD><A ID="awol" HREF="awol.htm"><IMG SRC="${img(page,'awol')}" WIDTH=77 HEIGHT=48 BORDER=0 ALT="A Week of Lies"></A></TD>
<TD><A ID="dol" HREF="#"><IMG SRC="${img(page,'dol')}" WIDTH=87 HEIGHT=48 BORDER=0 ALT="Database of Lies"></A></TD>
<TD><A ID="cl" HREF="cl.htm"><IMG SRC="${img(page,'cl')}" WIDTH=80 HEIGHT=48 BORDER=0 ALT="Celebrity Liar"></A></TD>
<TD><A ID="gl" HREF="gl0.htm"><IMG SRC="${img(page,'gl')}" WIDTH=63 HEIGHT=48 BORDER=0 ALT="Guest Liar"></A></TD>
<TD><A ID="sal" HREF="#"><IMG SRC="sal0.gif" WIDTH=90 HEIGHT=48 BORDER=0 ALT="Submit a Lie"></A></TD>
</TR></TABLE><P><IMG SRC="rbreak.gif" WIDTH=600 HEIGHT=8 ALT="------------" ALIGN=CENTER></P>`
}

function tokenizeAndSoundex(text) {
    const tokens = []
    let lastIndex = 0

    for (const match of text.matchAll(wordRegex)) {
        const wordStart = match.index
        const wordEnd = wordStart + match[0].length

        if (wordStart > lastIndex) {
            tokens.push({
                isWord: false,
                value: text.slice(lastIndex, wordStart),
                start: lastIndex,
                end: wordStart
            })
        }

        tokens.push({
            isWord: ! stopwordSet.has(match[0].toLowerCase()),
            soundex: soundex(match[0]),
            value: match[0],
            start: wordStart,
            end: wordEnd
        })

        lastIndex = wordEnd
    }

    if (lastIndex < text.length) {
        tokens.push({
            isWord: false,
            value: text.slice(lastIndex),
            start: lastIndex,
            end: text.length
        })
    }

    return tokens;
}

function constructIndex(lies) {
   let lookup = new Map()
    for (let aLie of lies) {
        tokenizeAndSoundex(aLie.lie).forEach(token => {
            if (token.isWord) {
                const currentList = lookup.get(token.soundex) || []
                currentList.push(aLie.id)
                lookup.set(token.soundex, currentList)
            }
        })
    }

    return lookup
}

function toDate(seconds) {
    if(seconds === null || seconds === 0) {
        return '[undated]'
    }        
    return new Date(seconds * 1000).toLocaleDateString('en-GB',{ weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

function toAnon(maybeEmail) {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
    const result = maybeEmail.replace(emailRegex, '[email redacted]').trim();
    return result === '' ? '[anon]' : result
}

function annotateLie(thisLie, soundexToLieIndices, soundexToCounter, compact=false, wrapper=undefined) {

    function wrap(input) {
        return wrapper ? `<${wrapper}>${input}</${wrapper}>` : input
    }

    const resultParts = []
    for (let token of tokenizeAndSoundex(thisLie.lie)) {
        if (token.isWord) {
            const hits = soundexToLieIndices.get(token.soundex)
            const hitIndex = soundexToCounter.get(token.soundex)
            const newTarget = (hitIndex + 1) < hits?.length ? hitIndex + 1 : 0
            soundexToCounter.set(token.soundex, newTarget)
            if(hits[hitIndex] == -1) { // -1 is a guest lie, which dont have legit IDs
                resultParts.push(`${token.value}`)
            } else {
                resultParts.push(`<a href=${hits[hitIndex]}.htm>${token.value}</a>`)
            }
        } else {
            resultParts.push(`${token.value}`)
        }
    }

    const lieBody = wrap(`${resultParts.join('')}`)
    
    if(compact) {
        return `<div class="wrap"><div class=lie>${lieBody}</div></div>`
    } else {
        return `<div class=wrap><div class=lie>${lieBody}</div><div class=liar>${toAnon(thisLie.liar)}</div><div class=submitted>${toDate(thisLie.submitted_on)}</div></div>`
    }
}

function dateToLindex(lies, date) {
    const N = lies.length
    const daysSinceEpoch = Math.floor((date - new Date(0)) / 86400000);
    return ((daysSinceEpoch * 2654435761) % 2**32) % (N + 1);  // hash it right up
}

function lbreak() { 
    return `<img height="8" src="lbreak.gif" width="600" />`
}
function vpad() { 
    return `<div class=mpad/>&nbsp;</div>`
}

function dateLabel(text, offset) 
{ 
    return `<div class=lotddate>${text}${formatDate(offset)}</div>`
}

function headline(text) { return `<h2>${text}</h2>`}

function bio(level,text) { return `<div class=bio${level}>${text}</div>`}

const markers = {
        0: ['',''],
        1: ['<em>','</em>']
}

function makeGl(soundexToLieIndices, soundexToCounter) {
    
    for(let i in guests) {
        const bits = []
        const guest = guests[i]
        for(let i of [1,2,3,4]) {
            if(guest[`bio.${i}`]) {
                bits.push(bio(i,guest[`bio.${i}`]))
            }
        }
        bits.push('<br/>')

        let alt = 0
        for(let lie of guest.lies) {
            bits.push(
                lbreak(),  
                vpad(),                                              
                markers[alt][0],           
                annotateLie({lie: lie, liar: guest.name}, soundexToLieIndices, soundexToCounter, true),
                markers[alt][1])

            alt = 1 - alt
        }

        bits.push(lbreak(), headline("Guest Liar's Hall Of Fame"))
        for(let j in guests) {
            if(i !== j) {
                bits.push(`<a href="gl${j}.htm">${guests[j].name}</a><br/>`)
            } else {
                bits.push(`${guests[j].name}<br/>`)
            }
        }

        fs.writeFileSync(`${outputRoot}/gl${i}.htm`, makeHeader('gl') + bits.join('') + footer)
    }
}

function makeAwol(lies, soundexToLieIndices, soundexToCounter) {
    const bits = []
    for(let history=1; history < 7; history++) {
        const currentDate = new Date()
        currentDate.setDate(currentDate.getDate() - history)
        const lie = lies[dateToLindex(lies, currentDate)]
        bits.push(history > 1 ? `<p>${lbreak()}</p>` : '')
        bits.push(
            dateLabel('The lie of ', history),
            markers[history%2][0], 
            annotateLie(lie, soundexToLieIndices, soundexToCounter),
            markers[history%2][1])
    }
    fs.writeFileSync(`${outputRoot}/awol.htm`, makeHeader('awol') + bits.join('') + footer)
}


function makeLotd(lies, soundexToLieIndices, soundexToCounter) {
    const bits = []
    
    const currentDate = new Date()
    const lie = lies[dateToLindex(lies, currentDate)]
    bits.push(
        dateLabel('The lie of today, ',0),
        lbreak(), 
        vpad(),
        annotateLie(lie, soundexToLieIndices, soundexToCounter))
    
    fs.writeFileSync(`${outputRoot}/lotd.htm`, makeHeader('lotd') + bits.join('') + footer)
}

function resolvePartial(name) {    
    fs.writeFileSync(`${outputRoot}/${name}.htm`, makeHeader(name) + fs.readFileSync(`partials/${name}.htm`, 'utf8') + footer);
}

function copyStatic() {
    const sourceDir = 'static';
    try {
        for (const file of fs.readdirSync(sourceDir)) {
            const sourcePath = path.join(sourceDir, file);
            const destPath = path.join(outputRoot, file);
            fs.cpSync(sourcePath, destPath, { recursive: true });
        }
    } catch (err) {
        console.error(err);
    }
}

function removeEverything() {
    try {
        fs.rmSync(outputRoot, { recursive: true, force: true });
        fs.mkdirSync(outputRoot, { recursive: true });
        console.log(`Cleaned and recreated directory: ${outputRoot}`);
    } catch (err) {
        console.error(`Error cleaning directory ${outputRoot}:`, err);
    }
}

try {
    const liesDocs = yaml.load(fs.readFileSync('./lie_db.yaml', 'utf8'));

    const countByStatus = new Map()
    for (const lie of liesDocs) {
        if (!countByStatus.get(lie.status)) {
            countByStatus.set(lie.status, [])
        }
        countByStatus.get(lie.status).push(lie)
    }

    for (const key of [...countByStatus.keys()]) {
        console.log(`${key} : ${countByStatus.get(key).length}`)
    }

    const accepted = countByStatus.get('A');

    console.log(accepted.length + ' accepted')

    const thinned = accepted.slice(0, Math.min(232323, accepted.length))

    console.log(thinned.length + ' thinned')

    for(let g of guests) {
        for(let l of g.lies) {
            thinned.push({lie: l, liar: g.name, id: -1 })
        }
    }
 
    const soundexToLieIndices = constructIndex(thinned)

    // init the counters to random positions
    const soundexToCounter = new Map()
    for (let [soundex, lieIndices] of soundexToLieIndices) {
        soundexToCounter.set(soundex, Math.round(Math.random() * (lieIndices.length - 1)))
    }

    removeEverything()

    for (let i = 0; i < thinned.length; i++) {
        fs.writeFileSync(`${outputRoot}/${thinned[i].id}.htm`, makeHeader('?') + annotateLie(thinned[i], soundexToLieIndices, soundexToCounter) + footer)
    }
    console.log(thinned.length + ' written to ' + outputRoot)
    
    makeAwol(thinned, soundexToLieIndices, soundexToCounter)

    makeGl(soundexToLieIndices, soundexToCounter)

    makeLotd(thinned, soundexToLieIndices, soundexToCounter)
    
    resolvePartial('dwol')
    resolvePartial('cl')
    resolvePartial('dol')

    copyStatic()

    fs.copyFileSync(`${outputRoot}/lotd.htm`, `${outputRoot}/index.html`) // required for github pages
    
} catch (e) {
    console.log(e);
}
