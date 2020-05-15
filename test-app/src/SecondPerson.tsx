import React, { useCallback, useState } from 'react';
import { Input } from './components';
import { useFirstName, useLastName, useInterests } from '../Form/secondPerson';
import { addSecondPerson, removeSecondPerson } from '../Form';
import { Person } from '../ITestForm';

const defaultSecondPerson: Person = {
  firstName: 'first',
  lastName: 'last',
  interests: [ 'int1', 'int2' ],
  address: {
    city: 'default',
    street: 'strdefault'
  }
}

const FirstName = () => {
  const [ name, setName ] = useFirstName();
  return <Input label='First Name' value={name} onChange={setName} />
}

const LastName = () => {
  const [ name, setName ] = useLastName();
  return <Input label='Last Name' value={name} onChange={setName} />
}

const Interests = () => {
  const [ newInterest, setNewInterest ] = useState('');
  const [ interests, _, { push, removeAt } ] = useInterests();

  const add = useCallback((value: string) => {
    push(value);
    setNewInterest('');
  }, [push, setNewInterest])

  return (
    <div>
      <input type='text' value={newInterest} onChange={e => setNewInterest(e.target.value)} />
      <button onClick={_ => add(newInterest)}>Add</button>
      { interests.map((int: string, idx: number) => (
          <div key={int}>
            <div style={{ display: 'inline-block' }}>{int}</div>
            <div style={{ display: 'inline-block' }}>
              <button onClick={_ => removeAt(idx)}>x</button>
            </div>
          </div>
        ))
      }
    </div>
  )
}

export const SecondPerson = () => {
    const [ hasSecondPerson, setHasSecondPerson ] = useState(false);

    const toggleSecondPerson = useCallback(() => {
        if (hasSecondPerson) {
          removeSecondPerson();
        } else {
          addSecondPerson(defaultSecondPerson);
        }
        setHasSecondPerson(!hasSecondPerson);
    }, [hasSecondPerson])

    return (
        <div>
            <div>Second Person</div>
            <div>
                <button onClick={toggleSecondPerson}>Add second person</button>
            </div>
            { hasSecondPerson && (
                <>
                    <FirstName />
                    <LastName />
                    <Interests />
                </>
            )}
        </div>
    )
}