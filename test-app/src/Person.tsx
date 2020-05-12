import React, { useCallback, useState } from 'react';
import { Input } from './components';
import { useFirstName, useLastName, useInterests } from '../Form/person';

export const FirstName = () => {
  const [ name, setName ] = useFirstName();
  return <Input label='First Name' value={name} onChange={setName} />
}

export const LastName = () => {
  const [ name, setName ] = useLastName();
  return <Input label='Last Name' value={name} onChange={setName} />
}

export const Interests = () => {
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