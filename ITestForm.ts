export interface Form {
    name: string;
    num: number;
    bool: boolean;
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