import React, { Component, createContext } from 'react';
import _ from 'lodash';
import moment from 'moment';

const cc = require('cryptocompare')

export const AppContext = createContext();

const MAX_FAVORITES = 10;
const TIME_UNITS = 10;

export class AppProvider extends Component {
  constructor(props) {
    super(props);
    this.state = {
      page: 'dashboard',
      favorites: ['BTC', 'ETH', 'XMR', 'DOGE'],
      ...this.savedSettings(),
      setPage: this.setPage,
      addCoin: this.addCoin,
      removeCoin: this.removeCoin,
      isInFavorites: this.isInFavorites,
      confirmFavorites: this.confirmFavorites,
      setFilteredCoins: this.setFilteredCoins,
      setCurrentFavorite: this.setCurrentFavorite
    }
  }

  componentDidMount = () => {
    this.fetchCoins();
    this.fetchPrices();
    this.fetchHistorical();
  }

  fetchHistorical = async () => {
    if (this.state.firstVisit) return;
    let results = await this.historical();
    let historical = [
      {
        name: this.state.currentFavorite,
        data: results.map((ticker, index) => [
          moment().subtract({months: TIME_UNITS - index}).valueOf(),
          ticker.USD
        ])
      }
    ];

    this.setState({historical})
  }

  fetchCoins = async () => {
    let coinList = (await cc.coinList()).Data
    this.setState({ coinList });
  }

  fetchPrices = async () => {
    if(this.state.firstVisit) return;
    let prices = await this.prices();
    prices = prices.filter(price => Object.keys(price).length);
    this.setState({prices});
  }

  prices = async () => {
    let returnData = [];

    for (let i = 0; i < this.state.favorites.length; i++) {
      try {
        let priceData = await cc.priceFull(this.state.favorites[i], 'USD');
        returnData.push(priceData);
      } catch(e) {
        console.warn('Fetch price error:', e);
      }
    }

    return returnData;
  }

  historical = () => {
    let promises = [];
    for (let units = TIME_UNITS; units > 0; units--) {
      promises.push(
        cc.priceHistorical(this.state.currentFavorite, ['USD'], moment().subtract({months: units}).toDate())
      )
    }

    return Promise.all(promises);
  }

  addCoin = key => {
    let favorites = [...this.state.favorites];
    if (favorites.length < MAX_FAVORITES) {
      favorites.push(key);
      this.setState({favorites});
    }
  }

  removeCoin = key => {
    let favorites = [...this.state.favorites];
    this.setState({favorites: _.pull(favorites, key)})
  }

  isInFavorites = key => _.includes(this.state.favorites, key)

  confirmFavorites = () => {
    let currentFavorite = this.state.favorites[0];
    this.setState({
      firstVisit: false,
      page: 'dashboard',
      currentFavorite,
      prices: null,
      historical: null
    }, () => {
      this.fetchPrices();
      this.fetchHistorical();
    });

    localStorage.setItem('coin', JSON.stringify({
      favorites: this.state.favorites,
      currentFavorite
    }));
  }

  setCurrentFavorite = (sym) => {
    this.setState({
      currentFavorite: sym,
      historical: null
    }, () => {
      this.fetchHistorical()
    });

    localStorage.setItem('coin', JSON.stringify({
      ...JSON.parse(localStorage.getItem('coin')),
      currentFavorite: sym
    }));
  }

  savedSettings() {
    let data = JSON.parse(localStorage.getItem('coin'));
    if (!data) {
      return {
        page: 'settings',
        firstVisit: true
      }
    }

    let { favorites, currentFavorite } = data;

    return {favorites, currentFavorite};
  }

  setPage = page => this.setState({ page })

  setFilteredCoins = (filteredCoins) => this.setState({filteredCoins})

  render() {
    return (
      <AppContext.Provider value={this.state}>
        {this.props.children}
      </AppContext.Provider>
    )
  }
}
