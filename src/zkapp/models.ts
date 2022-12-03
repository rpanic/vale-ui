export class SimpleObservable<T>{

    f: (arg: T) => void = () => {}

    subscribe(f: (arg: T) => void){
        this.f = f
    }

    next(t: T){
        this.f(t)
    }

}