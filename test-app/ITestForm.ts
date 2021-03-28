export interface Form {
    name: Names;
    num: number;
    bool: boolean;
    tuple: [ string, string[] ];
    person: Person;
    secondPerson?: Person;
    communities?: Community[];
}

export type Community = {
    communityId: string;
    name: string;
    fee: number;
    followUpAction: FollowUpActions;
    actionDate: Date;
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

export enum FollowUpActions {
    PhoneCall = 'phone-call',
    OnSiteVisit = 'on-site-visit',
    SendEmail = 'send-email',
}

export enum Names {
    Frank = 'Frank',
    Alice = 'Alice',
}