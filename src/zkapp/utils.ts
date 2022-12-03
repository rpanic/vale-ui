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