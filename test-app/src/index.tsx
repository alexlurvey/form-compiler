import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { trace } from '@thi.ng/transducers';
import { Names } from '../ITestForm';
import { form, setName } from '../Form';
import {
  setFirstName as setPersonFirstName,
  setLastName as setPersonLastName,
  setInterests as setPersonInterests,
} from '../Form/person';
import { setStreet as setPersonStreet, setCity as setPersonCity } from '../Form/person/address';
import {
  setFirstName as setSecondPersonFirstName,
  setLastName as setSecondPersonLastName,
  setInterests as setSecondPersonInterests,
} from '../Form/secondPerson';
import { setStreet as setSecondPersonStreet, setCity as setSecondPersonCity } from '../Form/secondPerson/address';
import { FirstName, LastName, Interests } from './Person';

const Form = () => {
  const [ formReady, setFormReady ] = useState(false);
  useEffect(() => {
    form.subscribe(trace('form'))

    setName(Names.Frank);

    setPersonFirstName('Alex')
    setPersonLastName('Lurvey')
    setPersonInterests(['test'])
    setPersonCity('city')
    setPersonStreet('street')

    setSecondPersonFirstName('Alex')
    setSecondPersonLastName('Lurvey')
    setSecondPersonInterests(['test'])
    setSecondPersonCity('city')
    setSecondPersonStreet('street')

    setFormReady(true);
  }, [setFormReady]);

  if (!formReady)
    return null;

  return (
    <>
      <FirstName />
      <LastName />
      <Interests />
      <div>
        <button onClick={_ => console.log(form.deref())}>Get Form</button>
      </div>
      <div>
        <button onClick={_ => setPersonFirstName('programatically setting...')}>Set First Name</button>
      </div>
    </>
  )
}

const Root = () => {
  return <Form />;
}

ReactDOM.render(
  <Root />,
  document.getElementById('app'),
);
