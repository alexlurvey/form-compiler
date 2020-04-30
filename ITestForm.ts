export interface Form {
    person: Person;
}

export type Person = {
    firstName: string;
    lastName: string;
    address: Address;
}

export type Address = {
    street: string;
    city: string;
}