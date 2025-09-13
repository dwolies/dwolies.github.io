
import { BrotliDecode } from './decode.min.js'

let searchIndex = undefined

async function brGet(url) {
    const response = await fetch(url)
    const compressedData = await response.arrayBuffer()
    return new TextDecoder().decode(BrotliDecode(new Uint8Array(compressedData)));
}

function soundex(word) {
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

    return (word[0].toUpperCase() + filteredChars.join('')).padEnd(4, '0').slice(0, 4)
}

function search(term) {
    const candidates = searchIndex.get(soundex(term))
    if (!candidates || candidates.length === 0) {
        console.log("No results found for term:", term);
        return;
    }
    const random = Math.floor(Math.random() * candidates.length);
    // Using window.open with '_self' is a more forceful way to navigate.
    window.open(`${candidates[random]}.htm`, '_self');
}

async function commonInit() {
    const codedString = await brGet('index.br');
    searchIndex = new Map(JSON.parse(codedString));
    document.getElementById('s').addEventListener('click', function(event) {
        event.preventDefault();
        search(document.getElementById('w').value);
    });
}

window.onload = commonInit;
