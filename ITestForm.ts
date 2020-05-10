export interface Form {
    name: Names;
    num: number;
    bool: boolean;
    tuple: [ string, string[] ];
    person: Person;
    secondPerson: Person;
}

export type Person = {
    firstName: string;
    lastName: string;
    address: Address;
    interests: string[];
}

export type Address = {
    street: string;
    city: string;
}

export enum Names {
    Frank = 'Frank',
    Alice = 'Alice',
}