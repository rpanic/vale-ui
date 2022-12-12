export function concatStringMiddle(s: String, length: number = 20) : String {
    if(s.length > length){
        return s.slice(0, length / 2 - 2) + "..." + s.slice(s.length - (length / 2 - 2), s.length);
    }else{
        return s
    }
}

export function roundNumber(n: number, decimals: number) : number {
    let exp = Math.pow(10, decimals)
    return Math.round(n * exp) / exp
}

export { tic, toc };
let timingStack: any[] = [];
let i = 0;
function tic(label = `Run command ${i++}`) {
    console.log(`${label}... `);
    timingStack.push([label, Date.now()]);
}
function toc() {
    let [label, start] = timingStack.pop();
    let time = (Date.now() - start) / 1000;
    console.log(`\r${label}... ${time.toFixed(3)} sec\n`);
}