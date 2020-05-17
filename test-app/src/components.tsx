import React, { useState, useCallback } from 'react';
import { Community as Comm } from '../ITestForm';

import { add, remove } from '../Form/communities/streams'

interface ICommunityProps {
  key: string;
  community: Comm;
}

interface IInputProps {
  label: string;
  value: string;
  onChange(str: string, e?: Event): void;
}

export const Input = ({ label, value, onChange }: IInputProps) => {
    return (
      <>
        <label>{label}</label>
        <input type='text' value={value} onChange={(e) => onChange(e.target.value)} />
      </>
    )
  }
  
type TestComm = {
  communityId: string
}

export const Communities = () => {
  const [ communities, setCommunities ] = useState<TestComm[]>([])

  const handleAdd = useCallback(() => {
    add();
    setCommunities(communities.concat({ communityId: 'new' }))
  }, [communities, setCommunities])
  
  return (
    <div>
      <div>Communities</div>
      <button onClick={handleAdd}>Add Community</button>
      {
        communities.map((q, idx) => (
          <div key={`${q.communityId}-${idx}`}>
            <div>Some Community: {q.communityId}</div>
            <div style={{ display: 'inline-block' }}>
              <button onClick={_ => remove(idx)}>x</button>
            </div>
          </div>
        ))
      }
    </div>
  )
}


export const Community = ({ community, key }: ICommunityProps) => {
  const [ name, setName ] = useState('');

  return (
    <div key={key}>
      <input type='string' value={name} onChange={e => setName(e.target.value)} />
    </div>
  )
}