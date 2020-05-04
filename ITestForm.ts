export interface Form {
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