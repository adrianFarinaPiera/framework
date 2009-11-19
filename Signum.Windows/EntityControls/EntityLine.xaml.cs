﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Documents;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Navigation;
using System.Windows.Shapes;
using System.Diagnostics;
using Signum.Utilities;
using Signum.Utilities.ExpressionTrees;
using Signum.Utilities.Reflection;
using System.Reflection;
using System.ComponentModel;
using Signum.Entities;
using System.Collections;

namespace Signum.Windows
{
    /// <summary>
    /// Interaction logic for UserControl1.xaml
    /// </summary>
    public partial class EntityLine : EntityBase
    {
        public event Func<string, IEnumerable<Lite>> AutoCompleting;

        public static readonly DependencyProperty AutoCompleteProperty =
            DependencyProperty.Register("AutoComplete", typeof(bool), typeof(EntityLine), new FrameworkPropertyMetadata(true));
        public bool AutoComplete
        {
            get { return (bool)GetValue(AutoCompleteProperty); }
            set { SetValue(AutoCompleteProperty, value); }
        }

        public static readonly DependencyProperty HideAutoCompleteOnLostFocusProperty =
            DependencyProperty.Register("HideAutoCompleteOnLostFocus", typeof(bool), typeof(EntityLine), new UIPropertyMetadata(true));
        public bool HideAutoCompleteOnLostFocus
        {
            get { return (bool)GetValue(HideAutoCompleteOnLostFocusProperty); }
            set { SetValue(HideAutoCompleteOnLostFocusProperty, value); }
        }

        int autoCompleteElements = 5;
        public int AutoCompleteElements
        {
            get { return autoCompleteElements; }
            set { autoCompleteElements = value; }
        }

        public EntityLine()
        {
            InitializeComponent();
        }

        public override void OnLoad(object sender, RoutedEventArgs e)
        {
            base.OnLoad(sender, e);

            if(Common.GetIsReadOnly(this))
                AutoComplete = false;
        }

        protected override void UpdateVisibility()
        {
            btCreate.Visibility = CanCreate() ? Visibility.Visible : Visibility.Collapsed;
            btFind.Visibility = CanFind() ? Visibility.Visible : Visibility.Collapsed;
            btView.Visibility = CanView() ? Visibility.Visible : Visibility.Collapsed;
            btRemove.Visibility = CanRemove() ? Visibility.Visible : Visibility.Collapsed;
        }


        private IEnumerable autoCompleteTextBox_AutoCompleting(string arg)
        {
            IEnumerable value;
            if (AutoCompleting != null)
                value = AutoCompleting(arg);
            else
                value = Server.FindLiteLike(CleanType, safeImplementations, arg, AutoCompleteElements);  

            return value;
        }

        private void autoCompleteTextBox_SelectedItemChanged(object sender, RoutedEventArgs e)
        {
        
            autoCompleteTextBox.Visibility = Visibility.Hidden;
            cc.Focus();
        }

        private void autoCompleteTextBox_Closed(object sender, CloseEventArgs e)
        {
            if (e.IsCommit)
            {
                SetEntityUserInteraction(Server.Convert(autoCompleteTextBox.SelectedItem, Type));
                autoCompleteTextBox.Visibility = Visibility.Hidden;
                cc.Focus();
            }
            else
            {
                if (e.Reason != CloseReason.LostFocus || HideAutoCompleteOnLostFocus)
                    autoCompleteTextBox.Visibility = Visibility.Hidden;
            }
        }

        public void ActivateAutoComplete()
        {
            if (AutoComplete && autoCompleteTextBox.Visibility != Visibility.Visible)
            {
                autoCompleteTextBox.Visibility = Visibility.Visible;
                autoCompleteTextBox.Text = Entity.TryCC(a => a.ToString());
                autoCompleteTextBox.SelectAndFocus();
            }
        }

        private void cc_PreviewKeyDown(object sender, KeyEventArgs e)
        {
            if (e.Key == Key.F2)
            {
                ActivateAutoComplete();
                e.Handled = true;
            }
        }

        bool doubleClicked = false;
        private void cc_MouseDoubleClick(object sender, MouseButtonEventArgs e)
        {
            doubleClicked = true; 
            ActivateAutoComplete();
        }

        private void cc_GotFocus(object sender, RoutedEventArgs e)
        {
            if (Entity == null)
            {
                ActivateAutoComplete();
                e.Handled = true;
            }
        }

        //private void autoCompleteTextBox_KeyDown(object sender, KeyEventArgs e)
        //{
        //    if (e.Key == Key.Escape)
        //    {
        //        autoCompleteTextBox.Visibility = Visibility.Hidden;
        //        autoCompleteTextBox.Close();
        //        e.Handled = true; 
        //    }
        //}

        private void cc_MouseDown(object sender, MouseButtonEventArgs e)
        {
            if (doubleClicked)
            {
                doubleClicked = false;
                return;
            }

            if (!cc.Focus())
                ActivateAutoComplete();
        }

    }
}
