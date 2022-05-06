import { t } from 'app/i18next-t';
import { storesSelector } from 'app/inventory/selectors';
import { Loadout } from 'app/loadout/loadout-types';
import {
  LoadoutUpdateFunction,
  setClassType,
  setClearSpace,
  setName,
  setNotes,
} from 'app/loadout/loadout-updates';
import { DestinyClass } from 'bungie-api-ts/destiny2';
import clsx from 'clsx';
import _ from 'lodash';
import React from 'react';
import { useSelector } from 'react-redux';
import { createSelector } from 'reselect';
import styles from './LoadoutDrawerOptions.m.scss';

const classTypeOptionsSelector = createSelector(storesSelector, (stores) => {
  const classTypeValues: {
    label: string;
    value: DestinyClass;
  }[] = _.uniqBy(
    stores.filter((s) => !s.isVault),
    (store) => store.classType
  ).map((store) => ({ label: store.className, value: store.classType }));
  return [{ label: t('Loadouts.Any'), value: DestinyClass.Unknown }, ...classTypeValues];
});

export default function LoadoutDrawerOptions({
  loadout,
  showClass,
  setLoadout,
}: {
  loadout: Readonly<Loadout>;
  showClass: boolean;
  setLoadout: (updater: LoadoutUpdateFunction) => void;
}) {
  const classTypeOptions = useSelector(classTypeOptionsSelector);

  const handleSetName = (e: React.ChangeEvent<HTMLInputElement>) =>
    setLoadout(setName(e.target.value));

  const handleSetClassType = (e: React.ChangeEvent<HTMLSelectElement>) =>
    setLoadout(setClassType(parseInt(e.target.value, 10)));

  const handleSetClearSpace = (e: React.ChangeEvent<HTMLInputElement>) =>
    setLoadout(setClearSpace(e.target.checked));

  const addNotes = () => setLoadout(setNotes(''));

  return (
    <div className={styles.loadoutOptions}>
      <div className={clsx(styles.inputGroup, styles.loadoutName)}>
        <input
          className={styles.dimInput}
          name="name"
          onChange={handleSetName}
          minLength={1}
          maxLength={50}
          required={true}
          type="text"
          value={loadout.name}
          placeholder={t('Loadouts.LoadoutName')}
        />
        {showClass && (
          <select name="classType" onChange={handleSetClassType} value={loadout.classType}>
            {classTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}
      </div>
      {loadout.notes === undefined && (
        <div className={styles.inputGroup}>
          <button
            className="dim-button"
            onClick={addNotes}
            type="button"
            title={t('Loadouts.AddNotes')}
          >
            {t('Loadouts.AddNotes')}
          </button>
        </div>
      )}
      <div className={styles.inputGroup}>
        <label>
          <input
            type="checkbox"
            checked={Boolean(loadout.clearSpace)}
            onChange={handleSetClearSpace}
          />{' '}
          {t('Loadouts.ClearSpace')}
        </label>
      </div>
    </div>
  );
}
