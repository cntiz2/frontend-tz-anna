import { useState, useRef, useEffect } from 'react';

const GOST_REGEXP = /ГОСТ\s\d{3,5}(-(\d{4}|\d{2}))?/gm;

function App() {
  const [messageError, setMessageError] = useState(
    <div className="mesasge" style={{ color: 'red' }}>
      Для размещения объявления, выберите хотя бы один раздел ОКС
    </div>
  ); //сообщение об ошибке
  const [messageSuccessfully, setMessageSuccessfully] = useState(null);
  const [allSections, setAllSections] = useState([]); //список всех разделов
  const [selectedSections, setSelectedSections] = useState([]); //(selected) список выбранных разделов
  const [receivedSectionCodes, setReceivedSectionCodes] = useState([]); //полученные коды из пост запроса
  const [uniqueListSectionObjects, setUniqueListSectionObjects] = useState([]); //храню массив объектов разделов по введенным ГОСТам (из textarea)
  const [uniqueListSectionsValue, setUniqueListSectionsValue] = useState([]); //храню имена (value) разделов по введенным ГОСТам (из textarea)
  const [isShownCalculate, setIsShownCalculate] = useState(false); //для показа блока расчета стоимости

  //рефы
  const nameRef = useRef();
  const textRef = useRef();
  const selectRef = useRef();
  const sumbitRef = useRef();

  //получаю список всех разделов
  const getSections = async () => {
    const response = await fetch('https://gostassistent.ru/api/oks')
      .then((response) => response.json())
      .catch((error) => console.error('Errore:', error));
    setAllSections(response);
  };

  //для вывода списка всех разделов
  const options = allSections.map((item) => (
    <option
      key={item.code}
      code={item.code}
      value={item.name}
      price={item.price}
    >
      {item.name}
    </option>
  ));

  //функция, фильтрующая уникальные элементы в массиве
  const getUniqueElements = (arr) => {
    return arr.filter((el, ind) => ind === arr.indexOf(el));
  };

  //фильтр для textarea
  const inputFilter = textRef.current?.value.match(GOST_REGEXP);

  //для пост запроса
  const data = {
    query: inputFilter,
  };

  // получаю коды по введенным гостам в textarea
  const getGOSTCodes = async () => {
    const response = await fetch('https://gostassistent.ru/api/query-oks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
      .then((response) => response.json())
      .catch((error) => {
        console.error('Error:', error);
      });
    // flushSync(() => setReceivedSectionCodes(response));
    setReceivedSectionCodes(response);
  };

  //массив кодов ГОСТ-ов из textarea
  const listSectionCodes = receivedSectionCodes.map((i) => i.results).flat();

  //получаю массив объектов разделов по ГОСТам из textarea
  function getUniqueListSectionObjects(listSectionCodes, allSections) {
    let acc = [];
    for (const k of listSectionCodes) {
      //получаю true, если такой code есть в уникальном массиве, и получаю этот объект из списка
      const l = allSections.filter((p) => p.code.includes(k));
      acc.push(l);
    }
    acc = acc.flat();
    return acc;
  }

  //активирую разделы по гостам из textarea
  function activationSelectedSection() {
    if (selectRef.current) {
      const selectElement = selectRef.current;
      const options = selectElement.options;
      uniqueListSectionsValue.forEach((value) => {
        for (let i = 0; i < options.length; i++) {
          if (options[i].value === value) {
            options[i].selected = true;
          }
        }
      });
    }
  }
  useEffect(() => {
    activationSelectedSection();
  }, [selectRef, uniqueListSectionsValue]);

  useEffect(() => {
    //запросы
    getSections();
    getGOSTCodes();

    //запсиываю выбранные вручную разделы тут (selected in multiselect)
    setSelectedSections(
      [...selectRef.current.selectedOptions].map((opt) => opt.value)
    );

    //запсиываю массив объектов разделов по ГОСТам из textarea
    setUniqueListSectionObjects(
      getUniqueListSectionObjects(listSectionCodes, allSections)
    );

    //записываю имена (value) разделов по ГОСТам из textarea
    setUniqueListSectionsValue(uniqueListSectionObjects.map((i) => i.name));
  }, []);

  //получаю массив объектов разделов по выделенным значениям value
  function getSelectedSectionsObjects(selectedSections, allSections) {
    let acc = [];
    for (const k of selectedSections) {
      //получаю true, если такой code есть в уникальном массиве, и получаю этот объект из списка
      const l = allSections.filter((p) => p.name.includes(k));
      acc.push(l);
    }
    acc = acc.flat();
    return acc;
  }
  const res = getSelectedSectionsObjects(selectedSections, allSections);

  //всего к оплате
  const totalPayable = getUniqueElements(res)
    .map((item) => item.price)
    .reduce((acc, v) => acc + v, 0);

  //для клика кнопки Х - удалить раздел из расчета
  function handleClickDelete(section) {
    const indexDeletedSection = selectedSections.indexOf(section.name);
    //удаляю этот элемент из массива
    const newArr = [
      ...selectedSections.slice(0, indexDeletedSection),
      ...selectedSections.slice(indexDeletedSection + 1),
    ];
    setSelectedSections(newArr);

    //снимаю selected c удаленного раздела
    const selectElement = selectRef.current;
    const options = selectElement.options;
    for (let i = 0; i < options.length; i++) {
      if (options[i].value === section.name) {
        options[i].selected = false;
      }
    }
  }

  //для вывода выделенных разделов под формой
  const selectedOptions = getUniqueElements(res).map((item) => (
    <li className="selected-sections__item section" key={item.code}>
      <div className="section__code">{item.code}</div>
      <div className="section__name">{item.name}</div>
      <div className="section__price">{item.price}</div>
      <button
        className="section__close"
        onClick={() => handleClickDelete(item)}
      >
        Х
      </button>
    </li>
  ));

  return (
    <main className="page__content">
      <form className="form">
        {/* Название обявления */}
        <div className="form__field">
          <div className="form__field--label">
            <label htmlFor="name" className="form__label">
              <span className="form__label-text">
                Введите название объявления
              </span>
            </label>
          </div>
          <div className="input">
            <input
              ref={nameRef}
              className="input__control"
              type="text"
              name="name"
              id="name"
              placeholder="Название обявления..."
            />
          </div>
        </div>

        {/* Описание объявления */}
        <div className="form__field">
          <div className="form__field--label">
            <label htmlFor="textarea" className="form__label">
              <span className="form__label-text">
                Введите описание объявления
              </span>
            </label>
          </div>
          <div className="input input--textarea">
            <textarea
              ref={textRef}
              className="input__control"
              type="text"
              name="textarea"
              id="textarea"
              cols="30"
              rows="10"
              placeholder="Описание объявления..."
              // defaultValue="Конусы по ГОСТ 8682: 29/32. Колбы изготовлены по ТУ 9464-013-52876351-2014 в соответствии с техническими требованиями ГОСТ 1770-74. Изделия изготовлены из стекла ХС1 по ГОСТ 21400-75. например «ГОСТ 8682-1213», «ГОСТ 530545665554-201245», «ГОСТ 54635413513512-69»"
            ></textarea>
          </div>
        </div>

        {/*  Выбор раздела ОКС */}
        <div className="form__field">
          <div className="form__field--label">
            <label htmlFor="select" className="form__label">
              <span className="form__label-text form__label-text--required">
                Выберите раздел(ы) ОКС (Общероссийский классификатор стандартов)
              </span>
            </label>
          </div>
          <div className="form__control">
            <div className="select">
              <select
                ref={selectRef}
                className="select__control"
                name="select"
                placeholder="Селект"
                multiple
                required
                onChange={() => {
                  setMessageError(null);
                }}
              >
                {options}
              </select>
            </div>
          </div>
        </div>
        {messageError}
        {messageSuccessfully}

        {/* Кнопка "Разместить объявление" */}
        <button
          onClick={() => {
            setMessageSuccessfully(
              <div className="mesasge" style={{ color: 'green' }}>
                Ваше объявление "{nameRef.current?.value}" успешно размещено!
              </div>
            );
          }}
          ref={sumbitRef}
          type="button"
          className="button button--submit"
        >
          <span className="button__text">Разместить объявление</span>
        </button>
      </form>

      {/* Кнопка "Подобрать ОКС на основе текста объявления" */}
      <button
        onClick={() => setIsShownCalculate(true)}
        type="button"
        className="button button--calculation"
      >
        <span className="button__text">
          Подобрать ОКС на основе текста объявления
        </span>
      </button>

      {/* Блок расчета стоимости */}
      {isShownCalculate && (
        <div>
          <ul className="selected-sections">{selectedOptions}</ul>
          <div className="total-payable">
            Всего к оплате:
            <span className="total-payable__sum">{totalPayable}</span>
          </div>
        </div>
      )}
    </main>
  );
}

export default App;
