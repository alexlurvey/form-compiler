import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { trace } from '@thi.ng/transducers';
import { Names, Form } from '../ITestForm';
import { form, addName, removeName, setNum, initForm } from '../Form';
import { setFirstName } from '../Form/person';
import { FirstName, LastName, Interests } from './Person';
import { SecondPerson } from './SecondPerson';
import { Communities } from './Communities';

const initialForm: Form = {
  name: Names.Frank,
  bool: true,
  num: 3,
  tuple: [ 'one', ['two']],
  communities: [],
  person: {
    firstName: 'Alex',
    lastName: 'Lurvey',
    interests: ['int1', 'int2'],
    address: {
      city: 'city',
      street: 'str',
    }
  }
}

const TestApp = () => {
  const [ formReady, setFormReady ] = useState(false);

  useEffect(() => {
    initForm(initialForm)
    form.subscribe(trace());
    setFormReady(true);
  }, [setFormReady])

  if (!formReady)
    return null;

  return (
    <>
      <div>
        <FirstName />
        <LastName />
        <Interests />
        <SecondPerson />
        <Communities />
      </div>
      <div>
        <button onClick={removeName}>Remove name</button>
        <button onClick={() => addName(Names.Alice)}>Add name</button>
      </div>
      <div>
        <button onClick={_ => console.log(form.deref())}>Get Form</button>
      </div>
      <div>
        <button onClick={_ => setFirstName('programatically setting...')}>Set First Name</button>
      </div>
      <div>
        <button onClick={_ => setNum(Math.random())}>Set Number</button>
      </div>
    </>
  )
}

const Root = () => {
  return <TestApp />;
}

ReactDOM.render(
  <Root />,
  document.getElementById('app'),
);
